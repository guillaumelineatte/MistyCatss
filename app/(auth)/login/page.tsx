'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { ButtonPrimary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { authClient } from '@/lib/auth-client'

const schema = z.object({
  email: z.email('Adresse email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'
  const [serverError, setServerError] = useState<string | null>(null)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [otp, setOtp] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { data, error } = await authClient.signIn.email({ email: values.email, password: values.password })
    if (error) {
      setServerError('Email ou mot de passe incorrect.')
      return
    }
    if ('twoFactorRedirect' in data && data.twoFactorRedirect) {
      setTwoFactorRequired(true)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function onVerifyOtp() {
    setServerError(null)
    const { error } = await authClient.twoFactor.verifyTotp({ code: otp })
    if (error) {
      setServerError('Code invalide.')
      return
    }
    router.push(next)
    router.refresh()
  }

  if (twoFactorRequired) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl">CODE DE VÉRIFICATION</h1>
        <p className="font-mono text-sm text-[var(--ink)]/70">Saisis le code à 6 chiffres de ton application d&apos;authentification.</p>
        <FormError message={serverError} />
        <Field label="Code" htmlFor="otp">
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className={inputClassName}
          />
        </Field>
        <ButtonPrimary onClick={onVerifyOtp}>Valider</ButtonPrimary>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h1 className="text-4xl">CONNEXION</h1>
        <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">Content de te revoir.</p>
      </div>
      <FormError message={serverError} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" className={inputClassName} {...register('email')} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          {...register('password')}
        />
      </Field>
      <ButtonPrimary>{isSubmitting ? 'Connexion…' : 'Se connecter'}</ButtonPrimary>
      <div className="flex flex-col items-center gap-2 font-mono text-xs">
        <Link href="/forgot-password" className="underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
        <p>
          Pas encore de compte ?{' '}
          <Link href="/signup" className="underline underline-offset-4">
            Créer un compte
          </Link>
        </p>
      </div>
    </form>
  )
}

