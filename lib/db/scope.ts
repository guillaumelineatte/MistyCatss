import 'server-only'

import { sql } from 'drizzle-orm'
import type { NeonDatabase } from 'drizzle-orm/neon-serverless'

import { scopedDb } from '@/db/scoped-client'
import { requireSession } from '@/lib/auth/session'
import type * as schema from '@/db/schema'

type Database = NeonDatabase<typeof schema>
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/**
 * Fabrique le point de passage OBLIGATOIRE pour toute requête touchant une
 * table utilisateur (voir Row Level Security, migration 0004). Positionne
 * `app.user_id` pour la durée de la transaction via `set_config` (paramétré,
 * pas d'injection possible) : les policies RLS n'autorisent alors que les
 * lignes de cet utilisateur. Sans passer par ici, `current_setting('app.user_id')`
 * est NULL et aucune ligne utilisateur n'est jamais renvoyée — "deny by
 * default", vérifié dans lib/db/__tests__/isolation.test.ts.
 *
 * Paramétrée par l'instance de base (plutôt que d'importer `db` directement)
 * pour que les tests d'intégration puissent la réutiliser telle quelle contre
 * la branche Neon de test.
 */
export function createUserScope(database: Database) {
  function withUserScope<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return database.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
      return fn(tx)
    })
  }

  async function withCurrentUserScope<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const session = await requireSession()
    return withUserScope(session.user.id, fn)
  }

  return { withUserScope, withCurrentUserScope }
}

export const { withUserScope, withCurrentUserScope } = createUserScope(scopedDb)
