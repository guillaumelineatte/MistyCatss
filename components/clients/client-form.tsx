'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable } from '@/db/schema'
import { createClientAction, updateClientAction, type ActionResult } from '@/lib/clients/actions'

type Client = typeof clientsTable.$inferSelect

const initialState: ActionResult = {}

export function ClientForm({
  mode,
  client,
  onDone,
}: {
  mode: 'create' | 'edit'
  client?: Client
  onDone?: () => void
}) {
  const action = mode === 'create' ? createClientAction : updateClientAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.refresh()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === 'edit' && client && <input type="hidden" name="id" value={client.id} />}
      {state.error && <FormError message={state.error} />}
      {state.duplicateWarning && (
        <div className="flex flex-col gap-2 border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-3">
          <p className="font-mono text-xs">{state.duplicateWarning}</p>
          <label className="flex items-center gap-2 font-mono text-xs">
            <input type="checkbox" name="confirmDuplicate" /> Créer quand même
          </label>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom" htmlFor="name">
          <input id="name" name="name" defaultValue={client?.name ?? ''} required className={inputClassName} />
        </Field>
        <Field label="SIRET" htmlFor="siret">
          <input id="siret" name="siret" defaultValue={client?.siret ?? ''} className={inputClassName} />
        </Field>
        <Field label="TVA intracommunautaire" htmlFor="vatNumber">
          <input id="vatNumber" name="vatNumber" defaultValue={client?.vatNumber ?? ''} className={inputClassName} />
        </Field>
        <Field label="Email de contact" htmlFor="contactEmail">
          <input id="contactEmail" name="contactEmail" type="email" defaultValue={client?.contactEmail ?? ''} className={inputClassName} />
        </Field>
        <Field label="Nom du contact" htmlFor="contactName">
          <input id="contactName" name="contactName" defaultValue={client?.contactName ?? ''} className={inputClassName} />
        </Field>
        <Field label="Téléphone" htmlFor="contactPhone">
          <input id="contactPhone" name="contactPhone" defaultValue={client?.contactPhone ?? ''} className={inputClassName} />
        </Field>
        <Field label="Adresse de facturation" htmlFor="billingAddressLine1">
          <input id="billingAddressLine1" name="billingAddressLine1" defaultValue={client?.billingAddressLine1 ?? ''} className={inputClassName} />
        </Field>
        <Field label="Complément d'adresse" htmlFor="billingAddressLine2">
          <input id="billingAddressLine2" name="billingAddressLine2" defaultValue={client?.billingAddressLine2 ?? ''} className={inputClassName} />
        </Field>
        <Field label="Code postal" htmlFor="billingPostalCode">
          <input id="billingPostalCode" name="billingPostalCode" defaultValue={client?.billingPostalCode ?? ''} className={inputClassName} />
        </Field>
        <Field label="Ville" htmlFor="billingCity">
          <input id="billingCity" name="billingCity" defaultValue={client?.billingCity ?? ''} className={inputClassName} />
        </Field>
        <Field label="TJM par défaut — €" htmlFor="defaultDailyRate">
          <input
            id="defaultDailyRate"
            name="defaultDailyRate"
            type="number"
            step="0.01"
            defaultValue={client?.defaultDailyRateCents != null ? client.defaultDailyRateCents / 100 : ''}
            className={inputClassName}
          />
        </Field>
        <Field label="Délai de paiement par défaut — jours" htmlFor="defaultPaymentTermsDays">
          <input
            id="defaultPaymentTermsDays"
            name="defaultPaymentTermsDays"
            type="number"
            defaultValue={client?.defaultPaymentTermsDays ?? ''}
            className={inputClassName}
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={client?.notes ?? ''} rows={3} className={inputClassName} />
      </Field>
      <div className="flex gap-3">
        <ButtonPrimary>{pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le client' : 'Enregistrer'}</ButtonPrimary>
        {onDone && (
          <ButtonSecondary onClick={onDone}>Annuler</ButtonSecondary>
        )}
      </div>
    </form>
  )
}
