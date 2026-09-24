import { relations } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { clients } from './clients'
import { numberingSeries } from './company'
import { invoiceEventEnum, invoiceStatusEnum, invoiceTypeEnum, quoteStatusEnum, recurringPeriodicityEnum } from './enums'

// --- Devis -------------------------------------------------------------

export const quotes = pgTable('quotes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  number: text('number'),
  status: quoteStatusEnum('status').default('draft').notNull(),
  issueDate: date('issue_date').notNull(),
  validUntil: date('valid_until'),
  currency: text('currency').default('EUR').notNull(),
  notes: text('notes'),
  publicToken: text('public_token').notNull().$defaultFn(() => crypto.randomUUID()),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedIp: text('accepted_ip'),
  // Pondération du pipeline prévisionnel (Phase 8) : chance de signature
  // estimée par l'utilisateur, jamais déduite automatiquement. Absente par
  // défaut — un devis sans estimation compte pour 100 % dans le pipeline non
  // pondéré plutôt que de se voir attribuer une probabilité inventée.
  winProbabilityBasisPoints: integer('win_probability_basis_points'),
  totalHtCents: integer('total_ht_cents').default(0).notNull(),
  totalVatCents: integer('total_vat_cents').default(0).notNull(),
  totalTtcCents: integer('total_ttc_cents').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('quotes_user_idx').on(table.userId, table.issueDate),
  unique('quotes_public_token_unique').on(table.publicToken),
])

export const quoteLines = pgTable('quote_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  quoteId: text('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  discountPercentBasisPoints: integer('discount_percent_basis_points'),
  discountAmountCents: integer('discount_amount_cents'),
  vatRateBasisPoints: integer('vat_rate_basis_points').notNull(),
  lineTotalHtCents: integer('line_total_ht_cents').notNull(),
}, (table) => [index('quote_lines_quote_idx').on(table.quoteId, table.position)])

// --- Factures ------------------------------------------------------------
// Immuables une fois émises (status != 'draft'). Toute correction passe par
// un avoir (type = 'credit_note'). Voir lib/invoicing/ (Phase 6) pour
// l'application de cette règle et le verrou de numérotation transactionnel.

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
  seriesId: text('series_id').references(() => numberingSeries.id, { onDelete: 'restrict' }),
  // Numéro attribué uniquement à l'émission, jamais avant (brouillon = NULL).
  number: integer('number'),
  fullNumber: text('full_number'),
  type: invoiceTypeEnum('type').default('standard').notNull(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  // Facture d'origine pour un avoir ('credit_note').
  creditNoteForInvoiceId: text('credit_note_for_invoice_id'),
  recurringTemplateId: text('recurring_template_id'),
  issueDate: date('issue_date'),
  saleDate: date('sale_date'),
  dueDate: date('due_date'),
  paymentTermsDays: integer('payment_terms_days'),
  escompteConditions: text('escompte_conditions'),
  latePenaltyRateBasisPoints: integer('late_penalty_rate_basis_points'),
  lateRecoveryIndemnityCents: integer('late_recovery_indemnity_cents'),
  buyerReference: text('buyer_reference'),
  paymentMeansCode: text('payment_means_code'),
  reverseCharge: boolean('reverse_charge').default(false).notNull(),
  currency: text('currency').default('EUR').notNull(),
  notes: text('notes'),
  publicToken: text('public_token').notNull().$defaultFn(() => crypto.randomUUID()),
  totalHtCents: integer('total_ht_cents').default(0).notNull(),
  totalVatCents: integer('total_vat_cents').default(0).notNull(),
  totalTtcCents: integer('total_ttc_cents').default(0).notNull(),
  paidAmountCents: integer('paid_amount_cents').default(0).notNull(),
  // Mentions légales + identité vendeur figées au moment de l'émission :
  // ne doit plus jamais changer même si companies/status_periods évoluent.
  legalSnapshot: jsonb('legal_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('invoices_user_idx').on(table.userId, table.issueDate),
  index('invoices_client_idx').on(table.clientId),
  unique('invoices_public_token_unique').on(table.publicToken),
  unique('invoices_series_number_unique').on(table.seriesId, table.number),
])

export const invoiceLines = pgTable('invoice_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  discountPercentBasisPoints: integer('discount_percent_basis_points'),
  discountAmountCents: integer('discount_amount_cents'),
  vatRateBasisPoints: integer('vat_rate_basis_points').notNull(),
  vatCategoryCode: text('vat_category_code'),
  lineTotalHtCents: integer('line_total_ht_cents').notNull(),
  timeEntryId: text('time_entry_id'),
}, (table) => [index('invoice_lines_invoice_idx').on(table.invoiceId, table.position)])

// Journal d'audit inaltérable : jamais d'UPDATE/DELETE applicatif.
export const invoiceAuditLog = pgTable('invoice_audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  event: invoiceEventEnum('event').notNull(),
  metadata: jsonb('metadata'),
  // Pas de FK vers user.id : le journal d'audit doit rester une trace
  // historique fidèle même après suppression du compte (conservation légale
  // des pièces, cf. PROMPT.md « Conformité »). Une FK ON DELETE SET NULL
  // provoquerait un UPDATE sur cette table à la suppression du compte, que
  // le trigger d'append-only (migration 0002) bloque à raison.
  actorUserId: text('actor_user_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('invoice_audit_log_invoice_idx').on(table.invoiceId, table.occurredAt)])

export const invoiceReminders = pgTable('invoice_reminders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  channel: text('channel').default('email').notNull(),
  templateUsed: text('template_used'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('invoice_reminders_invoice_idx').on(table.invoiceId)])

// --- Facturation récurrente -----------------------------------------------
// Génère des brouillons uniquement, jamais d'émission automatique.

export const recurringInvoiceTemplates = pgTable('recurring_invoice_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
  label: text('label').notNull(),
  periodicity: recurringPeriodicityEnum('periodicity').notNull(),
  dayOfMonth: integer('day_of_month'),
  nextRunDate: date('next_run_date').notNull(),
  active: boolean('active').default(true).notNull(),
  lastGeneratedInvoiceId: text('last_generated_invoice_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const recurringInvoiceTemplateLines = pgTable('recurring_invoice_template_lines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: text('template_id')
    .notNull()
    .references(() => recurringInvoiceTemplates.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  vatRateBasisPoints: integer('vat_rate_basis_points').notNull(),
}, (table) => [index('recurring_template_lines_template_idx').on(table.templateId, table.position)])

// --- Relations -------------------------------------------------------------

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  user: one(user, { fields: [quotes.userId], references: [user.id] }),
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  lines: many(quoteLines),
}))

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(user, { fields: [invoices.userId], references: [user.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  quote: one(quotes, { fields: [invoices.quoteId], references: [quotes.id] }),
  series: one(numberingSeries, { fields: [invoices.seriesId], references: [numberingSeries.id] }),
  lines: many(invoiceLines),
  auditLog: many(invoiceAuditLog),
  reminders: many(invoiceReminders),
}))

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
}))

export const invoiceAuditLogRelations = relations(invoiceAuditLog, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceAuditLog.invoiceId], references: [invoices.id] }),
}))

export const recurringInvoiceTemplatesRelations = relations(recurringInvoiceTemplates, ({ one, many }) => ({
  user: one(user, { fields: [recurringInvoiceTemplates.userId], references: [user.id] }),
  client: one(clients, { fields: [recurringInvoiceTemplates.clientId], references: [clients.id] }),
  lines: many(recurringInvoiceTemplateLines),
}))
