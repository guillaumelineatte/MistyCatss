const isDev = process.env.NODE_ENV === 'development'

// Sans nonce (voir node_modules/next/dist/docs/.../content-security-policy.md
// « Without Nonces ») : l'app utilise beaucoup de styles inline (jauges/barres
// de progression, `style={{ width: ... }}`) et le bootstrap Next.js lui-même
// a besoin d'un script inline — un CSP à base de nonce exigerait un rendu
// dynamique partout (plus de génération statique), disproportionné pour une
// appli perso. `unsafe-inline` reste nécessaire pour script-src ET style-src.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
