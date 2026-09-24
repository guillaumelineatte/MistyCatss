import 'server-only'

import { asc } from 'drizzle-orm'

import { deadlines } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export async function listDeadlines() {
  return withCurrentUserScope((tx) => tx.select().from(deadlines).orderBy(asc(deadlines.dueDate)))
}
