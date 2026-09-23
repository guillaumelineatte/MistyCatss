import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'

import { db } from '@/db/client'
import * as authSchema from '@/db/schema/auth'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    resetPasswordTokenExpiresIn: 60 * 60, // 1h, cf. PROMPT.md
    // La vérification anti mot de passe compromis se fait localement
    // (lib/auth/password-policy.ts, Phase 2) : aucune donnée envoyée à un
    // service externe type HaveIBeenPwned, pour respecter l'interdiction
    // d'envoi de données à un tiers sans validation explicite.
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
  },
  session: {
    cookieCache: { enabled: false },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  plugins: [
    twoFactor({
      issuer: 'Argent Brut',
    }),
  ],
})
