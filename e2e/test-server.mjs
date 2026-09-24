import { config } from 'dotenv'
import { spawn } from 'node:child_process'

config({ path: '.env.local' })

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DATABASE_SCOPED_URL || !process.env.TEST_DATABASE_URL_UNPOOLED) {
  console.error('TEST_DATABASE_URL / TEST_DATABASE_URL_UNPOOLED / TEST_DATABASE_SCOPED_URL manquantes dans .env.local — voir .env.example.')
  process.exit(1)
}

// Remappe la branche Neon "test" vers les variables que l'app lit
// normalement — jamais la branche production/dev pour des tests E2E qui
// créent de vraies données (comptes, factures...).
const env = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL_UNPOOLED,
  DATABASE_SCOPED_URL: process.env.TEST_DATABASE_SCOPED_URL,
  // Les liens envoyés par email (vérification, reset...) sont construits à
  // partir de ces deux variables : sans ce remap, ils pointeraient vers le
  // port 3000 (serveur de dev normal) au lieu du serveur de test 3100.
  BETTER_AUTH_URL: 'http://localhost:3100',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  PORT: '3100',
}

const child = spawn('pnpm', ['exec', 'next', 'dev', '-p', '3100'], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGTERM', () => child.kill('SIGTERM'))
process.on('SIGINT', () => child.kill('SIGINT'))
