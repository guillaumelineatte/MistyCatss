import { config } from 'dotenv'

config({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from '@/db/schema'
import { createUserScope } from '@/lib/db/scope'

// TEST_DATABASE_URL(_SCOPED) pointent sur une branche Neon dédiée aux tests
// (jamais la base de dev/prod, voir .env.example). Requises pour lancer
// isolation.test.ts.
if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DATABASE_SCOPED_URL) {
  throw new Error(
    "TEST_DATABASE_URL / TEST_DATABASE_SCOPED_URL manquantes (voir .env.example) : les tests d'isolation RLS ont besoin de leur propre branche Neon de test.",
  )
}

// Rôle admin (neondb_owner, BYPASSRLS) : uniquement pour le bootstrap des
// utilisateurs de test et le nettoyage — jamais pour lire/écrire les tables
// cloisonnées, ça rendrait les tests d'isolation inopérants.
export const testAdminPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
export const testAdminDb = drizzle(testAdminPool, { schema })

// Rôle restreint (app_scoped, NOBYPASSRLS) : celui que les tests d'isolation
// exercent réellement, exactement comme lib/db/scope.ts en production.
export const testScopedPool = new Pool({ connectionString: process.env.TEST_DATABASE_SCOPED_URL })
export const testScopedDb = drizzle(testScopedPool, { schema })
export const { withUserScope: withTestUserScope } = createUserScope(testScopedDb)
