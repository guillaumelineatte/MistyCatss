'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Field, FormError, inputClassName } from '@/components/form/field'
import { ButtonPrimary } from '@/components/finance-shell'
import { signUpAction, type ActionResult } from '@/lib/auth/actions'

const initialState: ActionResult = {}

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUpAction, initialState)

  if (state.success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-4xl">VÉRIFIE TES EMAILS</h1>
        <p className="font-mono text-sm leading-relaxed">
          Si cette adresse n&apos;est pas déjà utilisée, un email de confirmation vient de partir. Clique sur le lien
          qu&apos;il contient pour activer ton compte.
        </p>
        <Link href="/login" className="mt-4 font-mono text-xs underline underline-offset-4">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-4xl">CRÉER UN COMPTE</h1>
        <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">Gratuit, sans engagement.</p>
      </div>
      <FormError message={state.error} />
      <Field label="Nom" htmlFor="name">
        <input id="name" name="name" autoComplete="name" required className={inputClassName} />
      </Field>
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClassName} />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
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
      <ButtonPrimary>{pending ? 'Création…' : 'Créer mon compte'}</ButtonPrimary>
      <p className="text-center font-mono text-xs">
        Déjà un compte ?{' '}
        <Link href="/login" className="underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </form>
  )
}
