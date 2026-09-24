import 'server-only'

import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm'

import { db } from '@/db/client'
import { invoiceLines, invoices, statusPeriods } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

/**
 * Bascule en lecture les factures émises non soldées dont l'échéance est
 * dépassée vers "overdue" — en attendant la vraie tâche planifiée (Phase 10).
 */
async function flagOverdueInvoices(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  await withCurrentUserScope((tx) =>
    tx
      .update(invoices)
      .set({ status: 'overdue' })
      .where(
        and(
          eq(invoices.userId, userId),
          inArray(invoices.status, ['issued', 'sent', 'partially_paid']),
          lte(invoices.dueDate, today),
        ),
      ),
  )
}

export async function listInvoices(userId: string) {
  await flagOverdueInvoices(userId)
  return withCurrentUserScope((tx) =>
    tx.query.invoices.findMany({ where: eq(invoices.userId, userId), with: { client: true }, orderBy: desc(invoices.createdAt) }),
  )
}

export async function getInvoiceWithLines(id: string) {
  return withCurrentUserScope(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, id), with: { client: true } })
    if (!invoice) return null
    const lines = await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id)).orderBy(asc(invoiceLines.position))
    return { ...invoice, lines }
  })
}

export async function getInvoiceByPublicToken(token: string) {
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.publicToken, token), with: { client: true } })
  if (!invoice) return null
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id)).orderBy(asc(invoiceLines.position))
  return { ...invoice, lines }
}

/** Statut juridique EN VIGUEUR à une date donnée (jamais le statut "actuel"). */
export async function getStatusPeriodAtDate(userId: string, date: string) {
  return withCurrentUserScope((tx) =>
    tx.query.statusPeriods.findFirst({
      where: and(eq(statusPeriods.userId, userId), lte(statusPeriods.startDate, date)),
      orderBy: desc(statusPeriods.startDate),
    }),
  ).then((period) => {
    if (!period) return null
    if (period.endDate && period.endDate < date) return null
    return period
  })
}

/** Factures à relancer : émises, non soldées, échéance dépassée d'au moins un jour. */
export async function listInvoicesToRemind(userId: string) {
  return withCurrentUserScope((tx) =>
    tx.query.invoices.findMany({
      where: and(eq(invoices.userId, userId), eq(invoices.status, 'overdue')),
      with: { client: true },
      orderBy: asc(invoices.dueDate),
    }),
  )
}
