import 'server-only'

import { eq, inArray, sql } from 'drizzle-orm'

import { clients, invoices } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'
import { computeRealizedCa } from '@/lib/fiscal/queries'
import { getCashflowProjection } from '@/lib/forecast/queries'
import { listInvoices } from '@/lib/invoicing/queries'

const MONTH_LABELS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC']

function monthLabel(d: Date): string {
  return MONTH_LABELS[d.getUTCMonth()]
}

function monthBounds(d: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

/**
 * CA encaissé mois par mois sur les `monthsBack` mois précédant (et incluant)
 * `referenceMonth` (format `YYYY-MM`, mois en cours si omis) — jamais une
 * date implicite non paramétrable, pour que le sélecteur de période du
 * tableau de bord puisse remonter dans le temps.
 */
export async function getMonthlyRealizedCa(monthsBack: number, referenceMonth?: string): Promise<{ month: string; revenue: number }[]> {
  const ref = referenceMonth ? new Date(`${referenceMonth}-01T00:00:00Z`) : new Date()
  const results: { month: string; revenue: number }[] = []
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1))
    const { start, end } = monthBounds(d)
    const revenueCents = await computeRealizedCa(start, end)
    results.push({ month: monthLabel(d), revenue: Math.round(revenueCents / 100) })
  }
  return results
}

export async function getCurrentMonthComparison(
  referenceMonth?: string,
): Promise<{ currentCents: number; previousCents: number; changeBasisPoints: number | null }> {
  const ref = referenceMonth ? new Date(`${referenceMonth}-01T00:00:00Z`) : new Date()
  const current = monthBounds(ref)
  const previousDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1))
  const previous = monthBounds(previousDate)

  const [currentCents, previousCents] = await Promise.all([
    computeRealizedCa(current.start, current.end),
    computeRealizedCa(previous.start, previous.end),
  ])

  const changeBasisPoints = previousCents > 0 ? Math.round(((currentCents - previousCents) / previousCents) * 10_000) : null
  return { currentCents, previousCents, changeBasisPoints }
}

export async function getOverdueSummary(userId: string) {
  const allInvoices = await listInvoices(userId)
  const overdue = allInvoices.filter((invoice) => invoice.status === 'overdue').sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const totalOutstandingCents = overdue.reduce((sum, invoice) => sum + (invoice.totalTtcCents - invoice.paidAmountCents), 0)
  const oldest = overdue[0] ?? null
  const oldestDaysLate = oldest?.dueDate ? Math.round((Date.now() - new Date(oldest.dueDate).getTime()) / 86_400_000) : null
  return { count: overdue.length, totalOutstandingCents, oldest, oldestDaysLate, invoiceIds: overdue.map((i) => i.id) }
}

export async function getTopDependencyClient() {
  const issuedStatuses = ['issued', 'sent', 'partially_paid', 'paid', 'overdue'] as const
  return withCurrentUserScope(async (tx) => {
    const signedTtc = sql<string>`coalesce(sum(case when ${invoices.type} = 'credit_note' then -${invoices.totalTtcCents} else ${invoices.totalTtcCents} end), 0)`
    const rows = await tx
      .select({ clientId: invoices.clientId, total: signedTtc })
      .from(invoices)
      .where(inArray(invoices.status, [...issuedStatuses]))
      .groupBy(invoices.clientId)

    if (rows.length === 0) return null
    const totalAll = rows.reduce((sum, row) => sum + Number(row.total), 0)
    if (totalAll <= 0) return null

    const top = rows.reduce((max, row) => (Number(row.total) > Number(max.total) ? row : max))
    const client = await tx.query.clients.findFirst({ where: eq(clients.id, top.clientId) })
    if (!client) return null

    return {
      clientName: client.name,
      shareBasisPoints: Math.round((Number(top.total) / totalAll) * 10_000),
      totalCents: Number(top.total),
    }
  })
}

export async function getCashflowTrajectory(userId: string): Promise<{ month: string; value: number }[]> {
  const [p1, p2, p3] = await Promise.all([
    getCashflowProjection(userId, 30),
    getCashflowProjection(userId, 60),
    getCashflowProjection(userId, 90),
  ])
  return [p1, p2, p3].map((projection) => ({
    month: monthLabel(new Date(projection.horizonDate)),
    value: Math.round(projection.projectedBalanceCents / 100),
  }))
}
