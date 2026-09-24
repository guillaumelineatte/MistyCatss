'use client'

import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { Link2, Paperclip, Pencil, Search, Trash2 } from 'lucide-react'

import { ButtonPrimary, SectionLabel } from '@/components/finance-shell'
import { inputClassName } from '@/components/form/field'
import type {
  bankAccounts as bankAccountsTable,
  clients as clientsTable,
  invoicePayments as invoicePaymentsTable,
  invoices as invoicesTable,
  transactionCategories as categoriesTable,
  transactions as transactionsTable,
} from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { deleteTransactionAction, removeInvoicePaymentAction } from '@/lib/treasury/actions'
import { cn } from '@/lib/utils'
import { ReconcileForm } from './reconcile-form'
import { TransactionForm } from './transaction-form'

type BankAccount = typeof bankAccountsTable.$inferSelect
type Category = typeof categoriesTable.$inferSelect
type Invoice = typeof invoicesTable.$inferSelect & { client: typeof clientsTable.$inferSelect | null }
type InvoicePayment = typeof invoicePaymentsTable.$inferSelect & { invoice: typeof invoicesTable.$inferSelect }
type Transaction = typeof transactionsTable.$inferSelect & { category: Category | null; bankAccount: BankAccount; invoicePayments: InvoicePayment[] }

const filterInputClassName = cn(inputClassName, 'mt-0 w-auto')

export function TransactionsPanel({
  transactions,
  bankAccounts,
  categories,
  reconcilableInvoices,
}: {
  transactions: Transaction[]
  bankAccounts: BankAccount[]
  categories: Category[]
  reconcilableInvoices: Invoice[]
}) {
  const router = useRouter()
  const [search, setSearch] = useQueryState('q', { defaultValue: '', shallow: false })
  const [accountId, setAccountId] = useQueryState('account', { defaultValue: '', shallow: false })
  const [categoryId, setCategoryId] = useQueryState('category', { defaultValue: '', shallow: false })
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [reconcilingId, setReconcilingId] = useState<string | null>(null)

  async function onDelete(id: string) {
    if (!confirm('Supprimer cette transaction ? Un rapprochement éventuel sera annulé.')) return
    await deleteTransactionAction(id)
    router.refresh()
  }

  async function onRemovePayment(paymentId: string) {
    if (!confirm('Annuler ce rapprochement ? La facture redeviendra non soldée pour ce montant.')) return
    await removeInvoicePaymentAction(paymentId)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="pink">Relevé</SectionLabel>
          <h2 className="text-3xl">TRANSACTIONS</h2>
        </div>
        <ButtonPrimary onClick={() => setCreating((v) => !v)}>{creating ? 'Annuler' : 'Ajouter une transaction'}</ButtonPrimary>
      </div>

      {creating && bankAccounts.length > 0 && (
        <div className="border-2 border-[var(--ink)] p-4">
          <TransactionForm mode="create" bankAccounts={bankAccounts} categories={categories} onDone={() => setCreating(false)} />
        </div>
      )}
      {creating && bankAccounts.length === 0 && (
        <p className="font-mono text-xs text-[var(--ink)]/60">Crée d&apos;abord un compte bancaire ci-dessus.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex h-11 min-w-[200px] flex-1 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 focus-within:border-[var(--blue)]">
          <Search aria-hidden="true" className="size-4" />
          <input
            aria-label="Rechercher un libellé"
            value={search}
            onChange={(event) => setSearch(event.target.value || null)}
            placeholder="Rechercher…"
            className="w-full bg-transparent font-mono text-xs outline-none"
          />
        </div>
        <select aria-label="Filtrer par compte" value={accountId} onChange={(event) => setAccountId(event.target.value || null)} className={filterInputClassName}>
          <option value="">Tous les comptes</option>
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <select aria-label="Filtrer par catégorie" value={categoryId} onChange={(event) => setCategoryId(event.target.value || null)} className={filterInputClassName}>
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {transactions.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucune transaction.</p>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-xs">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="border-b border-[var(--ink)]/30 pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[var(--ink)]/50">{transaction.date.split('-').reverse().join('/')}</span>
                <span className="min-w-[140px] flex-1">{transaction.label}</span>
                <span className="text-[var(--ink)]/50">{transaction.bankAccount.name}</span>
                {transaction.category && <span className="border border-[var(--ink)] px-2 py-0.5">{transaction.category.name}</span>}
                {transaction.receiptFileId && (
                  <a href={`/api/files/${transaction.receiptFileId}`} target="_blank" rel="noopener noreferrer" aria-label="Voir le justificatif">
                    <Paperclip className="size-4" />
                  </a>
                )}
                <span className={transaction.amountCents < 0 ? 'text-[var(--pink)]' : 'text-[var(--blue)]'}>{formatEuros(transaction.amountCents)}</span>
                <button aria-label="Modifier la transaction" onClick={() => setEditingId(editingId === transaction.id ? null : transaction.id)}>
                  <Pencil className="size-4" />
                </button>
                <button aria-label="Rapprocher avec une facture" onClick={() => setReconcilingId(reconcilingId === transaction.id ? null : transaction.id)}>
                  <Link2 className="size-4" />
                </button>
                <button aria-label="Supprimer la transaction" onClick={() => onDelete(transaction.id)}>
                  <Trash2 className="size-4" />
                </button>
              </div>

              {editingId === transaction.id && (
                <div className="mt-3 border-2 border-[var(--ink)] p-4">
                  <TransactionForm
                    mode="edit"
                    bankAccounts={bankAccounts}
                    categories={categories}
                    transaction={transaction}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              )}

              {reconcilingId === transaction.id && (
                <div className="mt-3 border-2 border-[var(--ink)] p-4">
                  <ReconcileForm transaction={transaction} invoices={reconcilableInvoices} onDone={() => setReconcilingId(null)} />
                </div>
              )}

              {transaction.invoicePayments.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 pl-1">
                  {transaction.invoicePayments.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-2 text-[var(--ink)]/60">
                      <Link2 className="size-3" />
                      <span>
                        Rapproché avec {payment.invoice.fullNumber ?? payment.invoice.id} · {formatEuros(payment.amountCents)}
                      </span>
                      <button className="underline" onClick={() => onRemovePayment(payment.id)}>
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
