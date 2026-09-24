import { relations } from 'drizzle-orm'
import { boolean, date, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { clients } from './clients'
import { invoiceLines } from './documents'

export const projects = pgTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  targetDailyRateCents: integer('target_daily_rate_cents'),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const timeEntries = pgTable('time_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  date: date('date').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  billable: boolean('billable').default(true).notNull(),
  description: text('description'),
  // Une fois converti en ligne de facture, l'entrée reste modifiable
  // uniquement si la facture cible est encore un brouillon (règle appliquée
  // en Phase 9, pas au niveau schéma).
  invoiceLineId: text('invoice_line_id').references(() => invoiceLines.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('time_entries_user_idx').on(table.userId, table.date)])

// Chrono persistant entre sessions/appareils : au plus une ligne "active"
// par utilisateur (startedAt non nul = en cours).
export const activeTimers = pgTable('active_timers', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  description: text('description'),
  startedAt: timestamp('started_at', { withTimezone: true }),
})

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(user, { fields: [projects.userId], references: [user.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  timeEntries: many(timeEntries),
}))

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(user, { fields: [timeEntries.userId], references: [user.id] }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
  invoiceLine: one(invoiceLines, { fields: [timeEntries.invoiceLineId], references: [invoiceLines.id] }),
}))
