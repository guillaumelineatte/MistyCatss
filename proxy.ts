import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

// Vérification optimiste (présence du cookie de session uniquement, pas
// d'appel base) — la vérification réelle a lieu dans le DAL de chaque
// Server Component/Action (lib/auth/session.ts, Phase 3). Voir
// node_modules/next/dist/docs/.../authentication.md.
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (sessionCookie && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:png|svg|jpg|jpeg|ico|webmanifest)$).*)'],
}
