'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState } from 'react'

import { ButtonPrimary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { resetPasswordAction, type ActionResult } from '@/lib/auth/actions'

const initialState: ActionResult = {}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, action, pending] = useActionState(resetPasswordAction, initialState)

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-4xl">LIEN INVALIDE</h1>
        <p className="font-mono text-sm">Ce lien de réinitialisation est incomplet ou a expiré.</p>
        <Link href="/forgot-password" className="mt-2 font-mono text-xs underline underline-offset-4">
          Redemander un lien
        </Link>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-4xl">MOT DE PASSE MIS À JOUR</h1>
        <p className="font-mono text-sm">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
        <Link href="/login" className="mt-2 font-mono text-xs underline underline-offset-4">
          Se connecter
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-4xl">NOUVEAU MOT DE PASSE</h1>
      </div>
      <FormError message={state.error} />
      <Field label="Nouveau mot de passe" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className={inputClassName}
        />
        <p className="mt-2 font-mono text-[11px] text-[var(--ink)]/60">Au moins 12 caractères.</p>
      </Field>
      <ButtonPrimary>{pending ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}</ButtonPrimary>
    </form>
  )
}
