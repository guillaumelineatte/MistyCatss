import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from '@/db/schema'
import { createFullFixtureSet, deleteFullFixtureSet, SCOPED_TABLES } from './fixtures'
import { testAdminDb, testAdminPool, testScopedDb, testScopedPool, withTestUserScope } from './test-db'

const userA = { id: `isolation-test-a-${Date.now()}`, name: 'User A', email: `a-${Date.now()}@isolation.test` }
const userB = { id: `isolation-test-b-${Date.now()}`, name: 'User B', email: `b-${Date.now()}@isolation.test` }

let fixturesA: Awaited<ReturnType<typeof createFullFixtureSet>>
let fixturesB: Awaited<ReturnType<typeof createFullFixtureSet>>

beforeAll(async () => {
  await testAdminDb.insert(schema.user).values([
    { ...userA, emailVerified: true },
    { ...userB, emailVerified: true },
  ])
  fixturesA = await createFullFixtureSet(userA.id)
  fixturesB = await createFullFixtureSet(userB.id)
}, 30_000)

afterAll(async () => {
  // Nettoyage explicite dans l'ordre de dépendance : voir le commentaire de
  // deleteFullFixtureSet pour pourquoi un simple cascade depuis "user" ne
  // suffit pas (et ne doit pas suffire) une fois de l'historique financier
  // en jeu.
  await deleteFullFixtureSet(userA.id)
  await deleteFullFixtureSet(userB.id)
  await testAdminDb.delete(schema.user).where(eq(schema.user.id, userA.id))
  await testAdminDb.delete(schema.user).where(eq(schema.user.id, userB.id))
  await testAdminPool.end()
  await testScopedPool.end()
})

describe('Row Level Security — aucune table utilisateur lisible sans filtre', () => {
  it.each(SCOPED_TABLES)('%s renvoie 0 ligne sans app.user_id positionné, alors que des données existent', async (table) => {
    // Rôle app_scoped (NOBYPASSRLS), mais sans passer par withTestUserScope :
    // app.user_id n'est jamais positionné, donc RLS doit tout refuser.
    const result = await testScopedDb.execute<{ count: string }>(sql`select count(*) as count from ${sql.identifier(table)}`)
    expect(Number(result.rows[0].count)).toBe(0)
  })
})

describe('Row Level Security — isolation entre comptes', () => {
  it('un utilisateur ne voit que ses propres clients', async () => {
    const seenByA = await withTestUserScope(userA.id, (tx) => tx.select().from(schema.clients))
    expect(seenByA).toHaveLength(1)
    expect(seenByA[0].id).toBe(fixturesA.client.id)

    const seenByB = await withTestUserScope(userB.id, (tx) => tx.select().from(schema.clients))
    expect(seenByB).toHaveLength(1)
    expect(seenByB[0].id).toBe(fixturesB.client.id)
  })

  it("un utilisateur ne peut pas lire le client d'un autre compte par son id", async () => {
    const row = await withTestUserScope(userA.id, (tx) =>
      tx.query.clients.findFirst({ where: eq(schema.clients.id, fixturesB.client.id) }),
    )
    expect(row).toBeUndefined()
  })

  it("un utilisateur ne peut pas lire les lignes de facture d'un autre compte (table enfant)", async () => {
    const rows = await withTestUserScope(userA.id, (tx) =>
      tx.select().from(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, fixturesB.invoice.id)),
    )
    expect(rows).toHaveLength(0)
  })

  it("un UPDATE scoping A n'affecte aucune ligne appartenant à B", async () => {
    const result = await withTestUserScope(userA.id, (tx) =>
      tx.update(schema.clients).set({ name: 'Tentative' }).where(eq(schema.clients.id, fixturesB.client.id)),
    )
    expect(result.rowCount ?? 0).toBe(0)

    const stillIntact = await withTestUserScope(userB.id, (tx) =>
      tx.query.clients.findFirst({ where: eq(schema.clients.id, fixturesB.client.id) }),
    )
    expect(stillIntact?.name).toBe(`Client ${userB.id}`)
  })

  it("un DELETE scoping A n'affecte aucune ligne appartenant à B", async () => {
    const result = await withTestUserScope(userA.id, (tx) =>
      tx.delete(schema.deadlines).where(and(eq(schema.deadlines.userId, userB.id))),
    )
    expect(result.rowCount ?? 0).toBe(0)
  })

  it("un INSERT avec un user_id usurpé est rejeté (WITH CHECK)", async () => {
    await expect(
      withTestUserScope(userA.id, (tx) =>
        tx.insert(schema.clients).values({ userId: userB.id, name: 'Usurpation' }),
      ),
    ).rejects.toThrow()
  })
})
