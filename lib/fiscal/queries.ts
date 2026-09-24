import 'server-only'

import { and, eq, gte, lte, ne, sql } from 'drizzle-orm'

import { invoicePayments, invoices } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

/**
 * CA ENCAISSÉ sur la période (somme des paiements reçus, pas des factures
 * émises) — c'est l'assiette des cotisations en micro-entreprise, jamais le
 * CA facturé. Les avoirs n'ont normalement pas de paiement propre, exclus
 * par sécurité si jamais un jour ils en portaient un.
 */
export async function computeRealizedCa(periodStart: string, periodEnd: string): Promise<number> {
  const [row] = await withCurrentUserScope((tx) =>
    tx
      .select({ total: sql<string>`coalesce(sum(${invoicePayments.amountCents}), 0)` })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(ne(invoices.type, 'credit_note'), gte(invoicePayments.paidAt, periodStart), lte(invoicePayments.paidAt, periodEnd))),
  )
  return Number(row?.total ?? 0)
}
