'use server'

import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { checkPasswordPolicy, passwordPolicyMessages } from '@/lib/auth/password-policy'

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.'),
  email: z.email('Adresse email invalide.').trim(),
  password: z.string(),
})

export type ActionResult = { error?: string; success?: boolean }

// Message générique volontaire : ne jamais révéler si un email existe déjà.
const GENERIC_SIGNUP_SUCCESS: ActionResult = { success: true }

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }
  }

  const policyError = checkPasswordPolicy(parsed.data.password)
  if (policyError) {
    return { error: passwordPolicyMessages[policyError] }
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data })
    return GENERIC_SIGNUP_SUCCESS
  } catch (error) {
    if (error instanceof APIError && error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
      // Email déjà utilisé : même message que le succès, pour ne rien
      // révéler. Le titulaire du compte existant ne reçoit pas d'email.
      return GENERIC_SIGNUP_SUCCESS
    }
    console.error('[auth] signUpAction failed', error)
    return { error: 'Une erreur est survenue. Réessaie dans un instant.' }
  }
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string(),
})

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: 'Lien invalide. Redemande une réinitialisation.' }
  }

  const policyError = checkPasswordPolicy(parsed.data.password)
  if (policyError) {
    return { error: passwordPolicyMessages[policyError] }
  }

  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token: parsed.data.token } })
    return { success: true }
  } catch (error) {
    if (error instanceof APIError) {
      return { error: 'Ce lien de réinitialisation est invalide ou a expiré. Redemande un email.' }
    }
    console.error('[auth] resetPasswordAction failed', error)
    return { error: 'Une erreur est survenue. Réessaie dans un instant.' }
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string(),
})

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  })
  if (!parsed.success) {
    return { error: 'Formulaire invalide.' }
  }

  const policyError = checkPasswordPolicy(parsed.data.newPassword)
  if (policyError) {
    return { error: passwordPolicyMessages[policyError] }
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    })
    return { success: true }
  } catch (error) {
    if (error instanceof APIError) {
      return { error: 'Mot de passe actuel incorrect.' }
    }
    console.error('[auth] changePasswordAction failed', error)
    return { error: 'Une erreur est survenue. Réessaie dans un instant.' }
  }
}
