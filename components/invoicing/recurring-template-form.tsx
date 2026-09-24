'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { QuoteLineEditor, type LineDraft } from '@/components/quotes/quote-line-editor'
import type { clients as clientsTable, recurringInvoiceTemplateLines as templateLinesTable, recurringInvoiceTemplates as templatesTable } from '@/db/schema'
import { createRecurringTemplateAction, updateRecurringTemplateAction, type ActionResult } from '@/lib/recurring/actions'

type Client = typeof clientsTable.$inferSelect
type Template = typeof templatesTable.$inferSelect
type TemplateLine = typeof templateLinesTable.$inferSelect

const initialState: ActionResult = {}
const today = () => new Date().toISOString().slice(0, 10)

export function RecurringTemplateForm({
  mode,
  clients,
  template,
  lines,
  onDone,
}: {
  mode: 'create' | 'edit'
  clients: Client[]
  template?: Template
  lines?: TemplateLine[]
  onDone?: () => void
}) {
  const action = mode === 'create' ? createRecurringTemplateAction : updateRecurringTemplateAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.refresh()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  const initialLines: LineDraft[] | undefined = lines?.map((line) => ({
    description: line.description,
    quantity: Number(line.quantity),
    unitPriceCents: line.unitPriceCents,
    discountPercentBasisPoints: null,
    vatRateBasisPoints: line.vatRateBasisPoints,
  }))

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {mode === 'edit' && template && <input type="hidden" name="id" value={template.id} />}
      {state.error && <FormError message={state.error} />}

      <div className="grid gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)] md:grid-cols-3">
        <Field label="Libellé du modèle" htmlFor="label">
          <input id="label" name="label" defaultValue={template?.label ?? ''} required className={inputClassName} />
        </Field>
        <Field label="Client" htmlFor="clientId">
          <select id="clientId" name="clientId" defaultValue={template?.clientId ?? ''} required className={inputClassName}>
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
        <Field label="Périodicité" htmlFor="periodicity">
          <select id="periodicity" name="periodicity" defaultValue={template?.periodicity ?? 'monthly'} className={inputClassName}>
            <option value="monthly">Mensuelle</option>
            <option value="quarterly">Trimestrielle</option>
            <option value="yearly">Annuelle</option>
          </select>
        </Field>
        <Field label="Jour du mois (optionnel)" htmlFor="dayOfMonth">
          <input id="dayOfMonth" name="dayOfMonth" type="number" min={1} max={28} defaultValue={template?.dayOfMonth ?? ''} className={inputClassName} />
        </Field>
        <Field label="Prochaine génération" htmlFor="nextRunDate">
          <input id="nextRunDate" name="nextRunDate" type="date" defaultValue={template?.nextRunDate ?? today()} required className={inputClassName} />
        </Field>
      </div>

      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
        <h2 className="mb-4 text-2xl">LIGNES</h2>
        <QuoteLineEditor initialLines={initialLines} />
      </div>

      <div className="flex gap-3">
        <ButtonPrimary>{pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le modèle' : 'Enregistrer'}</ButtonPrimary>
        {onDone && <ButtonSecondary onClick={onDone}>Annuler</ButtonSecondary>}
      </div>
    </form>
  )
}
