'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable, invoices as invoicesTable, transactions as transactionsTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { reconcileTransactionAction, type ActionResult } from '@/lib/treasury/actions'

type Invoice = typeof invoicesTable.$inferSelect & { client: typeof clientsTable.$inferSelect | null }
type Transaction = typeof transactionsTable.$inferSelect

const initialState: ActionResult = {}
const today = () => new Date().toISOString().slice(0, 10)

export function ReconcileForm({ transaction, invoices, onDone }: { transaction: Transaction; invoices: Invoice[]; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(reconcileTransactionAction, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.refresh()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  if (invoices.length === 0) {
    return <p className="font-mono text-xs text-[var(--ink)]/60">Aucune facture émise non soldée à rapprocher.</p>
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="transactionId" value={transaction.id} />
      {state.error && <FormError message={state.error} />}
      <Field label="Facture" htmlFor="invoiceId">
        <select id="invoiceId" name="invoiceId" required className={inputClassName}>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.fullNumber} · {invoice.client?.name} · reste {formatEuros(invoice.totalTtcCents - invoice.paidAmountCents)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Montant rapproché — €" htmlFor="amount">
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={Math.abs(transaction.amountCents) / 100}
            required
            className={inputClassName}
          />
        </Field>
        <Field label="Date de paiement" htmlFor="paidAt">
          <input id="paidAt" name="paidAt" type="date" defaultValue={transaction.date ?? today()} required className={inputClassName} />
        </Field>
      </div>
      <div className="flex gap-3">
        <ButtonPrimary>{pending ? 'Rapprochement…' : 'Rapprocher'}</ButtonPrimary>
        {onDone && <ButtonSecondary onClick={onDone}>Annuler</ButtonSecondary>}
      </div>
    </form>
  )
}
