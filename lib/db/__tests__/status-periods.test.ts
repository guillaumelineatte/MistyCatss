import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '@/db/schema'
import { testAdminDb, testAdminPool, testScopedPool, withTestUserScope } from './test-db'

// PROMPT.md « Statut juridique » : un exercice à cheval sur deux statuts doit
// s'afficher correctement, avec une séparation visible — ce test vérifie que
// le modèle de données représente fidèlement ce cas (deux périodes
// contiguës, sans trou ni chevauchement, correctement attribuables par date).
const userId = `status-period-test-${Date.now()}`

beforeAll(async () => {
  await testAdminDb.insert(schema.user).values({ id: userId, name: 'Straddle Test', email: `${userId}@example.com`, emailVerified: true })
})

afterAll(async () => {
  await testAdminDb.delete(schema.statusPeriods).where(eq(schema.statusPeriods.userId, userId))
  await testAdminDb.delete(schema.user).where(eq(schema.user.id, userId))
  await testAdminPool.end()
  await testScopedPool.end()
})

describe('Exercice à cheval sur deux statuts juridiques', () => {
  it('représente une transition micro -> EURL en cours d\'année sans trou ni chevauchement', async () => {
    // L'utilisateur était en micro-entreprise depuis 2024, passe en EURL le
    // 1er juillet 2025 : deux périodes contiguës pour le même exercice 2025.
    await withTestUserScope(userId, (tx) =>
      tx.insert(schema.statusPeriods).values({
        userId,
        status: 'micro',
        vatRegime: 'franchise',
        startDate: '2024-01-01',
      }),
    )

    await withTestUserScope(userId, async (tx) => {
      await tx
        .update(schema.statusPeriods)
        .set({ endDate: '2025-06-30' })
        .where(eq(schema.statusPeriods.userId, userId))
      await tx.insert(schema.statusPeriods).values({
        userId,
        status: 'eurl',
        vatRegime: 'reel_simplifie',
        startDate: '2025-07-01',
      })
    })

    const periods = await withTestUserScope(userId, (tx) =>
      tx.select().from(schema.statusPeriods).where(eq(schema.statusPeriods.userId, userId)).orderBy(asc(schema.statusPeriods.startDate)),
    )

    expect(periods).toHaveLength(2)
    expect(periods[0]).toMatchObject({ status: 'micro', startDate: '2024-01-01', endDate: '2025-06-30' })
    expect(periods[1]).toMatchObject({ status: 'eurl', startDate: '2025-07-01', endDate: null })

    // Une opération datée avant le 1er juillet relève du statut micro...
    const operationDateBefore = '2025-03-15'
    const periodForBefore = periods.find(
      (p) => p.startDate <= operationDateBefore && (p.endDate === null || p.endDate >= operationDateBefore),
    )
    expect(periodForBefore?.status).toBe('micro')

    // ...une opération datée après relève de l'EURL, jamais rétroactivement.
    const operationDateAfter = '2025-09-01'
    const periodForAfter = periods.find(
      (p) => p.startDate <= operationDateAfter && (p.endDate === null || p.endDate >= operationDateAfter),
    )
    expect(periodForAfter?.status).toBe('eurl')
  })

  it('refuse une période qui chevauche une période existante (contrainte EXCLUDE)', async () => {
    await expect(
      testAdminDb.insert(schema.statusPeriods).values({
        userId,
        status: 'sasu',
        vatRegime: 'reel_normal',
        startDate: '2025-01-01',
        endDate: '2025-03-01',
      }),
    ).rejects.toThrow()
  })
})
