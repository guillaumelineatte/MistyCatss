'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { createBankAccountAction, type ActionResult } from '@/lib/treasury/actions'

const initialState: ActionResult = {}

export function BankAccountForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(createBankAccountAction, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.refresh()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <FormError message={state.error} />}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nom du compte" htmlFor="name">
          <input id="name" name="name" required placeholder="Compte pro" className={inputClassName} />
        </Field>
        <Field label="IBAN" htmlFor="iban">
          <input id="iban" name="iban" className={inputClassName} />
        </Field>
        <Field label="Solde d'ouverture — €" htmlFor="openingBalance">
          <input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue={0} className={inputClassName} />
        </Field>
      </div>
      <div className="flex gap-3">
        <ButtonPrimary>{pending ? 'Création…' : 'Créer le compte'}</ButtonPrimary>
        {onDone && <ButtonSecondary onClick={onDone}>Annuler</ButtonSecondary>}
      </div>
    </form>
  )
}
