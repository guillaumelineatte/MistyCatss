'use client'

import { useActionState } from 'react'

import { ButtonPrimary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable, quotes as quotesTable, quoteLines as quoteLinesTable } from '@/db/schema'
import { createQuoteAction, updateQuoteAction, type ActionResult } from '@/lib/quotes/actions'
import { QuoteLineEditor, type LineDraft } from './quote-line-editor'

type Client = typeof clientsTable.$inferSelect
type Quote = typeof quotesTable.$inferSelect
type QuoteLine = typeof quoteLinesTable.$inferSelect

const initialState: ActionResult = {}
const today = () => new Date().toISOString().slice(0, 10)

export function QuoteForm({
  mode,
  clients,
  quote,
  lines,
}: {
  mode: 'create' | 'edit'
  clients: Client[]
  quote?: Quote
  lines?: QuoteLine[]
}) {
  const action = mode === 'create' ? createQuoteAction : updateQuoteAction
  const [state, formAction, pending] = useActionState(action, initialState)

  const initialLines: LineDraft[] | undefined = lines?.map((line) => ({
    description: line.description,
    quantity: Number(line.quantity),
    unitPriceCents: line.unitPriceCents,
    discountPercentBasisPoints: line.discountPercentBasisPoints,
    vatRateBasisPoints: line.vatRateBasisPoints,
  }))

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {mode === 'edit' && quote && <input type="hidden" name="id" value={quote.id} />}
      {state.error && <FormError message={state.error} />}

      <div className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)] md:grid-cols-3">
        <Field label="Client" htmlFor="clientId">
          <select id="clientId" name="clientId" defaultValue={quote?.clientId ?? ''} required className={inputClassName}>
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date d'émission" htmlFor="issueDate">
          <input id="issueDate" name="issueDate" type="date" defaultValue={quote?.issueDate ?? today()} required className={inputClassName} />
        </Field>
        <Field label="Valable jusqu'au" htmlFor="validUntil">
          <input id="validUntil" name="validUntil" type="date" defaultValue={quote?.validUntil ?? ''} className={inputClassName} />
        </Field>
      </div>

      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
        <h2 className="mb-4 text-2xl">LIGNES</h2>
        <QuoteLineEditor initialLines={initialLines} />
      </div>

      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={quote?.notes ?? ''} rows={3} className={inputClassName} />
      </Field>

      <div>
        <ButtonPrimary>{pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le devis' : 'Enregistrer'}</ButtonPrimary>
      </div>
    </form>
  )
}
