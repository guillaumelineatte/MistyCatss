'use client'

import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Repli client-safe : NEXT_PUBLIC_APP_URL explicite en Production, sinon
// l'équivalent Vercel exposé au client pour les previews (voir lib/env.ts
// pour la version serveur de ce même repli).
const baseURL =
  process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined)

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient()],
})

export const { useSession, signIn, signOut, signUp } = authClient
