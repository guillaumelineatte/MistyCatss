'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { ButtonPrimary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { authClient } from '@/lib/auth-client'

const schema = z.object({ email: z.email('Adresse email invalide.') })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/reset-password',
    })
    // Message générique dans tous les cas : ne jamais révéler si l'email existe.
    if (error) setServerError('Une erreur est survenue. Réessaie dans un instant.')
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-4xl">VÉRIFIE TES EMAILS</h1>
        <p className="font-mono text-sm leading-relaxed">
          Si cette adresse est associée à un compte, un lien de réinitialisation vient d&apos;être envoyé. Il est
          valable 1 heure.
        </p>
        <Link href="/login" className="mt-4 font-mono text-xs underline underline-offset-4">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h1 className="text-4xl">MOT DE PASSE OUBLIÉ</h1>
        <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">
          On t&apos;envoie un lien à usage unique, valable 1 heure.
        </p>
      </div>
      <FormError message={serverError} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClassName} {...register('email')} />
      </Field>
      <ButtonPrimary>{isSubmitting ? 'Envoi…' : 'Envoyer le lien'}</ButtonPrimary>
      <Link href="/login" className="text-center font-mono text-xs underline underline-offset-4">
        Retour à la connexion
      </Link>
    </form>
  )
}
