'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ButtonPrimary, ButtonSecondary, SectionLabel, StatCard } from '@/components/finance-shell'
import type {
  bankAccounts as bankAccountsTable,
  categoryRules as categoryRulesTable,
  clients as clientsTable,
  deadlines as deadlinesTable,
  invoicePayments as invoicePaymentsTable,
  invoices as invoicesTable,
  statusPeriods as statusPeriodsTable,
  transactionCategories as categoriesTable,
  transactions as transactionsTable,
  vatPeriods as vatPeriodsTable,
} from '@/db/schema'
import type { FiscalParamsResult } from '@/lib/fiscal/get-params'
import { formatEuros } from '@/lib/money'
import { archiveBankAccountAction, unarchiveBankAccountAction } from '@/lib/treasury/actions'
import { BankAccountForm } from './bank-account-form'
import { CategoryPanel } from './category-panel'
import { ChargesPanel } from './charges-panel'
import { DeadlinesPanel } from './deadlines-panel'
import { TransactionsPanel } from './transactions-panel'
import { VatPanel } from './vat-panel'

type Category = typeof categoriesTable.$inferSelect
type BankAccount = typeof bankAccountsTable.$inferSelect & { balanceCents: number }
type CategoryRule = typeof categoryRulesTable.$inferSelect & { category: Category | null }
type Invoice = typeof invoicesTable.$inferSelect & { client: typeof clientsTable.$inferSelect | null }
type InvoicePayment = typeof invoicePaymentsTable.$inferSelect & { invoice: typeof invoicesTable.$inferSelect }
type Transaction = typeof transactionsTable.$inferSelect & {
  category: Category | null
  bankAccount: typeof bankAccountsTable.$inferSelect
  invoicePayments: InvoicePayment[]
}
type Deadline = typeof deadlinesTable.$inferSelect
type VatPeriod = typeof vatPeriodsTable.$inferSelect
type StatusPeriod = typeof statusPeriodsTable.$inferSelect

export function TreasuryScreen({
  bankAccounts,
  transactions,
  categories,
  categoryRules,
  reconcilableInvoices,
  deadlines,
  vatPeriods,
  statusPeriod,
  fiscalParams,
  realizedCaCents,
}: {
  bankAccounts: BankAccount[]
  transactions: Transaction[]
  categories: Category[]
  categoryRules: CategoryRule[]
  reconcilableInvoices: Invoice[]
  deadlines: Deadline[]
  vatPeriods: VatPeriod[]
  statusPeriod: StatusPeriod | null
  fiscalParams: FiscalParamsResult | null
  realizedCaCents: number
}) {
  const router = useRouter()
  const [creatingAccount, setCreatingAccount] = useState(false)
  const activeAccounts = bankAccounts.filter((a) => !a.archivedAt)
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.balanceCents, 0)

  async function onToggleArchive(account: BankAccount) {
    if (account.archivedAt) await unarchiveBankAccountAction(account.id)
    else await archiveBankAccountAction(account.id)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Solde total" value={formatEuros(totalBalance)} note={`${activeAccounts.length} compte(s) actif(s)`} tone="blue" />
        <StatCard label="Transactions" value={String(transactions.length)} note="Sur la période filtrée" />
        <StatCard label="Factures à rapprocher" value={String(reconcilableInvoices.length)} note="Émises, non soldées" tone="pink" />
      </div>

      <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SectionLabel>Comptes</SectionLabel>
            <h2 className="text-3xl">COMPTES BANCAIRES</h2>
          </div>
          <ButtonPrimary onClick={() => setCreatingAccount((v) => !v)}>{creatingAccount ? 'Annuler' : 'Ajouter un compte'}</ButtonPrimary>
        </div>

        {creatingAccount && (
          <div className="border-2 border-[var(--ink)] p-4">
            <BankAccountForm onDone={() => setCreatingAccount(false)} />
          </div>
        )}

        {bankAccounts.length === 0 ? (
          <p className="font-mono text-xs text-[var(--ink)]/60">Aucun compte bancaire pour l&apos;instant.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between border-2 border-[var(--ink)] p-4 font-mono text-xs">
                <div>
                  <p className="font-bold">{account.name}</p>
                  <p className="mt-1 text-[var(--ink)]/60">{account.iban || 'IBAN non renseigné'}{account.archivedAt && ' · Archivé'}</p>
                  <p className="mt-2 font-anton text-2xl not-italic">{formatEuros(account.balanceCents)}</p>
                </div>
                <ButtonSecondary onClick={() => onToggleArchive(account)}>{account.archivedAt ? 'Réactiver' : 'Archiver'}</ButtonSecondary>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryPanel categories={categories} rules={categoryRules} />

      <TransactionsPanel
        transactions={transactions}
        bankAccounts={activeAccounts}
        categories={categories}
        reconcilableInvoices={reconcilableInvoices}
      />

      <ChargesPanel statusPeriod={statusPeriod} fiscalParams={fiscalParams} realizedCaCents={realizedCaCents} />

      <DeadlinesPanel deadlines={deadlines} />

      <VatPanel periods={vatPeriods} statusPeriod={statusPeriod} />
    </div>
  )
}
