import { and, eq, inArray, lt } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { invoices, quotes } from '@/db/schema'
import { verifyCronRequest } from '@/lib/cron/verify'

/**
 * Bascule (tous utilisateurs confondus) les devis envoyés périmés en
 * `expired` et les factures émises non soldées en retard en `overdue` —
 * jusqu'ici fait paresseusement à la lecture (Phases 5-6). Idempotent :
 * ne touche que les lignes encore dans l'état source, une double exécution
 * ne change rien de plus.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const expiredQuotes = await db
    .update(quotes)
    .set({ status: 'expired' })
    .where(and(eq(quotes.status, 'sent'), lt(quotes.validUntil, today)))
    .returning({ id: quotes.id })

  const overdueInvoices = await db
    .update(invoices)
    .set({ status: 'overdue' })
    .where(and(inArray(invoices.status, ['issued', 'sent', 'partially_paid']), lt(invoices.dueDate, today)))
    .returning({ id: invoices.id })

  return NextResponse.json({ expiredQuotes: expiredQuotes.length, overdueInvoices: overdueInvoices.length })
}
