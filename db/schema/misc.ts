import { relations } from 'drizzle-orm'
import { index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { files } from './files'

// Limitation de débit "maison" (fenêtre fixe), backée par Postgres plutôt
// qu'un service externe type Upstash/Redis non demandé par le projet — voir
// CLAUDE.md, décision Phase 2. `key` = ex. "login:ip:1.2.3.4" ou
// "login:email:<hash>". `windowStart` tronqué à la fenêtre (ex. minute).
export const rateLimitBuckets = pgTable('rate_limit_buckets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').default(0).notNull(),
}, (table) => [
  unique('rate_limit_buckets_unique').on(table.key, table.windowStart),
  index('rate_limit_buckets_window_idx').on(table.windowStart),
])

// Export RGPD complet des données utilisateur, généré en tâche de fond puis
// proposé au téléchargement.
export const dataExportRequests = pgTable('data_export_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(),
  fileId: text('file_id').references(() => files.id, { onDelete: 'set null' }),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const dataExportRequestsRelations = relations(dataExportRequests, ({ one }) => ({
  user: one(user, { fields: [dataExportRequests.userId], references: [user.id] }),
}))
