'use client'

import { useActionState } from 'react'

import { ButtonPrimary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable, invoiceLines as invoiceLinesTable, invoices as invoicesTable } from '@/db/schema'
import { createInvoiceAction, updateInvoiceAction, type ActionResult } from '@/lib/invoicing/actions'
import { QuoteLineEditor, type LineDraft } from '@/components/quotes/quote-line-editor'

type Client = typeof clientsTable.$inferSelect
type Invoice = typeof invoicesTable.$inferSelect
type InvoiceLine = typeof invoiceLinesTable.$inferSelect

const initialState: ActionResult = {}
const today = () => new Date().toISOString().slice(0, 10)

export function InvoiceForm({
  mode,
  clients,
  invoice,
  lines,
}: {
  mode: 'create' | 'edit'
  clients: Client[]
  invoice?: Invoice
  lines?: InvoiceLine[]
}) {
  const action = mode === 'create' ? createInvoiceAction : updateInvoiceAction
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
      {mode === 'edit' && invoice && <input type="hidden" name="id" value={invoice.id} />}
      {state.error && <FormError message={state.error} />}

      <div className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)] md:grid-cols-3">
        <Field label="Client" htmlFor="clientId">
          <select id="clientId" name="clientId" defaultValue={invoice?.clientId ?? ''} required className={inputClassName}>
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
        <Field label="Date de vente / prestation" htmlFor="saleDate">
          <input id="saleDate" name="saleDate" type="date" defaultValue={invoice?.saleDate ?? today()} required className={inputClassName} />
        </Field>
        <Field label="Délai de paiement — jours" htmlFor="paymentTermsDays">
          <input
            id="paymentTermsDays"
            name="paymentTermsDays"
            type="number"
            defaultValue={invoice?.paymentTermsDays ?? 30}
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
        <h2 className="mb-4 text-2xl">LIGNES</h2>
        <QuoteLineEditor initialLines={initialLines} />
      </div>

      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={invoice?.notes ?? ''} rows={3} className={inputClassName} />
      </Field>

      <div>
        <ButtonPrimary>{pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le brouillon' : 'Enregistrer'}</ButtonPrimary>
      </div>
    </form>
  )
}
