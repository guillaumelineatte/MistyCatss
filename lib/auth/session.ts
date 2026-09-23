import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { auth } from '@/lib/auth'

/**
 * Vérification RÉELLE de session (appel base via Better Auth), mémoïsée pour
 * la durée du rendu. proxy.ts ne fait qu'une vérification optimiste sur la
 * présence du cookie — c'est cette fonction qui fait foi partout ailleurs
 * (Server Components, Server Actions, Route Handlers).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

/**
 * À utiliser dans les Server Components/Actions qui exigent un utilisateur
 * connecté. Redirige vers /login si absent, plutôt que de renvoyer null
 * silencieusement (cf. node_modules/next/dist/docs/.../authentication.md).
 */
export async function requireSession() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}
