import 'server-only'

import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema'

declare global {
  var __dbPool: Pool | undefined
}

const pool =
  globalThis.__dbPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__dbPool = pool
}

export const db = drizzle(pool, { schema })
