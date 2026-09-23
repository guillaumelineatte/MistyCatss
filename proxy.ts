import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

// Vérification optimiste (présence du cookie de session uniquement, pas
// d'appel base) — la vérification réelle a lieu dans le DAL de chaque
// Server Component/Action (lib/auth/session.ts, Phase 3). Voir
// node_modules/next/dist/docs/.../authentication.md.

// Pages d'auth : jamais accessibles à un visiteur déjà connecté (redirigé vers "/").
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

// Consultation publique par jeton (devis/factures) : accessible avec OU sans
// session — un utilisateur connecté peut aussi prévisualiser ses propres liens.
const ALWAYS_PUBLIC_ROUTES = ['/public']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const isAlwaysPublicRoute = ALWAYS_PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie && !isAuthOnlyRoute && !isAlwaysPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (sessionCookie && isAuthOnlyRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|svg|jpg|jpeg|ico|webmanifest)$).*)'],
}
