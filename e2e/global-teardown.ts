import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'

config({ path: '.env.local' })

/**
 * Nettoie les comptes jetables créés par la suite (préfixe `e2e-`) sur la
 * branche Neon `test` après chaque exécution — même détour que db/seed.ts :
 * un compte avec historique de facturation ne peut pas être supprimé tant
 * que le trigger d'inaltérabilité du journal d'audit est actif.
 */
export default async function globalTeardown() {
  const url = process.env.TEST_DATABASE_URL_UNPOOLED
  if (!url) return

  const pool = new Pool({ connectionString: url })
  try {
    await pool.query('ALTER TABLE "invoices" DISABLE TRIGGER "invoices_no_delete_once_issued"')
    await pool.query('ALTER TABLE "invoice_audit_log" DISABLE TRIGGER "invoice_audit_log_append_only"')
    const result = await pool.query("DELETE FROM \"user\" WHERE email LIKE 'e2e-%' RETURNING id")
    await pool.query('ALTER TABLE "invoice_audit_log" ENABLE TRIGGER "invoice_audit_log_append_only"')
    await pool.query('ALTER TABLE "invoices" ENABLE TRIGGER "invoices_no_delete_once_issued"')
    console.log(`[e2e] ${result.rowCount} compte(s) de test nettoyé(s) sur la branche test.`)
  } finally {
    await pool.end()
  }
}
