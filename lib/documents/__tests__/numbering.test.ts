import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '@/db/schema'
import { testAdminDb, testAdminPool, testScopedPool, withTestUserScope } from '@/lib/db/__tests__/test-db'
import { formatDocumentNumber, getNextDocumentNumber, getOrCreateSeries } from '../numbering'

// PROMPT.md « Factures » : la séquence est générée en transaction avec verrou
// pour éviter tout doublon en concurrence — test de concurrence explicite.
// getNextDocumentNumber est la fonction partagée par les devis (Phase 5) et
// les factures (Phase 6) : la tester ici couvre les deux.
const userId = `numbering-test-${Date.now()}`

beforeAll(async () => {
  await testAdminDb.insert(schema.user).values({ id: userId, name: 'Numbering Test', email: `${userId}@example.com`, emailVerified: true })
})

afterAll(async () => {
  await testAdminDb.delete(schema.documentNumberCounters).where(eq(schema.documentNumberCounters.scopeYear, 2030))
  await testAdminDb.delete(schema.numberingSeries).where(eq(schema.numberingSeries.userId, userId))
  await testAdminDb.delete(schema.user).where(eq(schema.user.id, userId))
  await testAdminPool.end()
  await testScopedPool.end()
})

describe('Numérotation atomique (concurrence)', () => {
  it("20 appels concurrents sur la même série renvoient 20 numéros distincts et consécutifs", async () => {
    const series = await withTestUserScope(userId, (tx) => getOrCreateSeries(tx, userId, 'invoice'))

    const results = await Promise.all(
      Array.from({ length: 20 }, () => withTestUserScope(userId, (tx) => getNextDocumentNumber(tx, series.id, 2030))),
    )

    const unique = new Set(results)
    expect(unique.size).toBe(20)
    expect([...unique].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('formate le numéro avec préfixe, année et remplissage à zéro', () => {
    expect(formatDocumentNumber('F', 3, true, 2026, 7)).toBe('F2026-007')
    expect(formatDocumentNumber('A', 4, false, 2026, 12)).toBe('A0012')
  })
})
