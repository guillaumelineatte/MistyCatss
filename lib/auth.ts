import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { twoFactor } from 'better-auth/plugins'

import { db } from '@/db/client'
import * as authSchema from '@/db/schema/auth'
import { sendEmail } from '@/lib/email'
import {
  changeEmailNoticeToOldAddress,
  changeEmailVerificationEmail,
  deleteAccountEmail,
  passwordChangedEmail,
  resetPasswordEmail,
  verificationEmail,
} from '@/lib/email/templates'
import { getAppUrl } from '@/lib/env'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  // BETTER_AUTH_URL explicite en Production ; repli sur l'URL du déploiement
  // Vercel courant en preview (voir lib/env.ts) — jamais une URL de prod
  // figée qui rejetterait les requêtes d'une preview (Origin mismatch).
  baseURL: process.env.BETTER_AUTH_URL ?? getAppUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 60 * 60, // 1h, cf. PROMPT.md
    // Contrôle anti mot de passe compromis : fait en amont, côté Server
    // Action (lib/auth/password-policy.ts), avant même d'appeler
    // auth.api.signUpEmail — entièrement local, voir ce fichier.
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetPasswordEmail(url)
      await sendEmail({ to: user.email, subject, html })
    },
    onPasswordReset: async ({ user }) => {
      const { subject, html } = passwordChangedEmail()
      await sendEmail({ to: user.email, subject, html })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail(url)
      await sendEmail({ to: user.email, subject, html })
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // L'email actuel est déjà vérifié dans notre flux (vérification
      // obligatoire à l'inscription) : on envoie donc une confirmation à
      // l'ANCIENNE adresse (lien d'action) et un avis informatif à la
      // NOUVELLE adresse, pour satisfaire la double confirmation exigée.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const oldAddressEmail = changeEmailNoticeToOldAddress(url, newEmail)
        await sendEmail({ to: user.email, subject: oldAddressEmail.subject, html: oldAddressEmail.html })
        const newAddressEmail = changeEmailVerificationEmail(url, newEmail)
        await sendEmail({ to: newEmail, subject: newAddressEmail.subject, html: newAddressEmail.html })
      },
    },
    // Confirmation forte par email avant suppression effective du compte
    // (lien à usage unique, 24h) — en plus de la saisie de confirmation
    // côté interface (voir app/settings/security).
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        const { subject, html } = deleteAccountEmail(url)
        await sendEmail({ to: user.email, subject, html })
      },
    },
  },
  session: {
    cookieCache: { enabled: false },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  // Limitation de débit : connexion/inscription (3 / 10s) et reset/renvoi de
  // vérification (3 / 60s) sont déjà couverts par les règles par défaut de
  // Better Auth. Stockage en base (table `rateLimit`, générée par la CLI)
  // plutôt qu'en mémoire pour survivre au redémarrage des instances.
  rateLimit: {
    enabled: true,
    storage: 'database',
  },
  plugins: [
    twoFactor({
      issuer: 'Argent Brut',
    }),
    // Doit rester le DERNIER plugin : propage les cookies de session posés
    // par Better Auth à travers les Server Actions Next.js.
    nextCookies(),
  ],
})
