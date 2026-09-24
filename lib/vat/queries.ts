import 'server-only'

import { and, desc, gte, lte, ne, sql } from 'drizzle-orm'

import { invoices, vatPeriods } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export async function listVatPeriods() {
  return withCurrentUserScope((tx) => tx.select().from(vatPeriods).orderBy(desc(vatPeriods.periodStart)))
}

/**
 * TVA collectée sur la période : somme signée des `total_vat_cents` des
 * factures émises (jamais les brouillons/annulées), un avoir la réduisant.
 * Basée sur la date d'émission — pas de règle de TVA sur les encaissements
 * modélisée ici (régime réel simplifié/normal, pas de trésorerie).
 */
export async function computeCollectedVat(periodStart: string, periodEnd: string): Promise<number> {
  const signedVat = sql<string>`coalesce(sum(case when ${invoices.type} = 'credit_note' then -${invoices.totalVatCents} else ${invoices.totalVatCents} end), 0)`
  const [row] = await withCurrentUserScope((tx) =>
    tx
      .select({ total: signedVat })
      .from(invoices)
      .where(
        and(
          ne(invoices.status, 'draft'),
          ne(invoices.status, 'cancelled'),
          gte(invoices.issueDate, periodStart),
          lte(invoices.issueDate, periodEnd),
        ),
      ),
  )
  return Number(row?.total ?? 0)
}
