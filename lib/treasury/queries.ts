import 'server-only'

import { and, desc, eq, gte, ilike, lte, ne, sql } from 'drizzle-orm'

import { bankAccounts, categoryRules, invoices, transactionCategories, transactions } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export type BankAccountWithBalance = typeof bankAccounts.$inferSelect & { balanceCents: number }

/** Solde = solde d'ouverture + somme des transactions (signées) du compte. */
export async function listBankAccounts(): Promise<BankAccountWithBalance[]> {
  return withCurrentUserScope(async (tx) => {
    const accounts = await tx.select().from(bankAccounts).orderBy(bankAccounts.createdAt)
    const sums = await tx
      .select({ bankAccountId: transactions.bankAccountId, total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)` })
      .from(transactions)
      .groupBy(transactions.bankAccountId)
    const sumByAccount = new Map(sums.map((s) => [s.bankAccountId, Number(s.total)]))
    return accounts.map((account) => ({ ...account, balanceCents: account.openingBalanceCents + (sumByAccount.get(account.id) ?? 0) }))
  })
}

export type TransactionFilters = {
  bankAccountId?: string
  categoryId?: string
  search?: string
  from?: string
  to?: string
}

export async function listTransactions(filters: TransactionFilters = {}) {
  return withCurrentUserScope((tx) =>
    tx.query.transactions.findMany({
      where: and(
        filters.bankAccountId ? eq(transactions.bankAccountId, filters.bankAccountId) : undefined,
        filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
        filters.search ? ilike(transactions.label, `%${filters.search}%`) : undefined,
        filters.from ? gte(transactions.date, filters.from) : undefined,
        filters.to ? lte(transactions.date, filters.to) : undefined,
      ),
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      with: { category: true, bankAccount: true, invoicePayments: { with: { invoice: true } } },
    }),
  )
}

export async function listCategories() {
  return withCurrentUserScope((tx) => tx.select().from(transactionCategories).orderBy(transactionCategories.name))
}

export async function listCategoryRules() {
  return withCurrentUserScope((tx) => tx.query.categoryRules.findMany({ with: { category: true }, orderBy: desc(categoryRules.createdAt) }))
}

/** Factures émises non soldées, éligibles à un rapprochement avec une transaction bancaire. */
export async function listReconcilableInvoices() {
  return withCurrentUserScope((tx) =>
    tx.query.invoices.findMany({
      where: and(
        ne(invoices.type, 'credit_note'),
        sql`${invoices.status} in ('issued', 'sent', 'partially_paid', 'overdue')`,
        sql`${invoices.totalTtcCents} > ${invoices.paidAmountCents}`,
      ),
      with: { client: true },
      orderBy: desc(invoices.dueDate),
    }),
  )
}
