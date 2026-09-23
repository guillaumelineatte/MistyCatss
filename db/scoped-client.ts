import 'server-only'

import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema'

// Connexion dédiée au rôle Postgres restreint `app_scoped` (NOBYPASSRLS) —
// voir drizzle/0005_app_scoped_role.sql et lib/db/scope.ts. Ne JAMAIS utiliser
// cette instance pour du code qui a besoin de contourner la RLS (migrations,
// seed, adaptateur Better Auth) : utiliser db/client.ts pour ça.
declare global {
  var __scopedDbPool: Pool | undefined
}

const pool =
  globalThis.__scopedDbPool ??
  new Pool({
    connectionString: process.env.DATABASE_SCOPED_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__scopedDbPool = pool
}

export const scopedDb = drizzle(pool, { schema })
