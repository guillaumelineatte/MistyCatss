import { relations } from 'drizzle-orm'
import { date, index, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { invoices } from './documents'
import { deadlineKindEnum, deadlineStatusEnum, transactionCategoryKindEnum, vatPeriodStatusEnum } from './enums'

export const bankAccounts = pgTable('bank_accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  iban: text('iban'),
  currency: text('currency').default('EUR').notNull(),
  openingBalanceCents: integer('opening_balance_cents').default(0).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const transactionCategories = pgTable('transaction_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: transactionCategoryKindEnum('kind').notNull(),
  color: text('color'),
}, (table) => [unique('transaction_categories_unique').on(table.userId, table.name)])

export const categoryRules = pgTable('category_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  matchPattern: text('match_pattern').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => transactionCategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  bankAccountId: text('bank_account_id')
    .notNull()
    .references(() => bankAccounts.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  label: text('label').notNull(),
  // Signé : positif = entrée, négatif = sortie.
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').references(() => transactionCategories.id, { onDelete: 'set null' }),
  receiptFileId: text('receipt_file_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('transactions_user_idx').on(table.userId, table.date)])

// Rapprochement facture <-> transaction. Une facture peut avoir plusieurs
// paiements partiels ; une transaction peut (en théorie) couvrir plusieurs
// factures (acompte groupé) mais Phase 7 ne couvre que le cas 1:1 / partiel
// simple — table déjà prête pour le cas multiple.
export const invoicePayments = pgTable('invoice_payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'restrict' }),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  amountCents: integer('amount_cents').notNull(),
  paidAt: date('paid_at').notNull(),
  method: text('method'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('invoice_payments_invoice_idx').on(table.invoiceId)])

export const deadlines = pgTable('deadlines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: deadlineKindEnum('kind').notNull(),
  dueDate: date('due_date').notNull(),
  amountEstimateCents: integer('amount_estimate_cents'),
  status: deadlineStatusEnum('status').default('pending').notNull(),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('deadlines_user_idx').on(table.userId, table.dueDate)])

export const vatPeriods = pgTable('vat_periods', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  collectedCents: integer('collected_cents').default(0).notNull(),
  deductibleCents: integer('deductible_cents').default(0).notNull(),
  status: vatPeriodStatusEnum('status').default('draft').notNull(),
  preparedAt: timestamp('prepared_at', { withTimezone: true }),
}, (table) => [unique('vat_periods_unique').on(table.userId, table.periodStart, table.periodEnd)])

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  user: one(user, { fields: [bankAccounts.userId], references: [user.id] }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(user, { fields: [transactions.userId], references: [user.id] }),
  bankAccount: one(bankAccounts, { fields: [transactions.bankAccountId], references: [bankAccounts.id] }),
  category: one(transactionCategories, { fields: [transactions.categoryId], references: [transactionCategories.id] }),
}))

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] }),
  transaction: one(transactions, { fields: [invoicePayments.transactionId], references: [transactions.id] }),
}))
