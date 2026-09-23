import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from './auth'

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  siret: text('siret'),
  vatNumber: text('vat_number'),
  billingAddressLine1: text('billing_address_line1'),
  billingAddressLine2: text('billing_address_line2'),
  billingPostalCode: text('billing_postal_code'),
  billingCity: text('billing_city'),
  billingCountry: text('billing_country').default('FR'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  defaultPaymentTermsDays: integer('default_payment_terms_days'),
  defaultDailyRateCents: integer('default_daily_rate_cents'),
  notes: text('notes'),
  // Jamais de suppression si des documents existent (PROMPT.md) : on archive.
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const clientsRelations = relations(clients, ({ one }) => ({
  user: one(user, { fields: [clients.userId], references: [user.id] }),
}))
