import 'server-only'

import { eq } from 'drizzle-orm'

import { userPreferences } from '@/db/schema'
import { listDeadlines } from '@/lib/deadlines/queries'
import { withCurrentUserScope } from '@/lib/db/scope'
import { computeWeightedPipeline, projectCashflow } from '@/lib/fiscal/forecast'
import { listInvoices } from '@/lib/invoicing/queries'
import { listQuotes } from '@/lib/quotes/queries'
import { listBankAccounts } from '@/lib/treasury/queries'

export async function getRevenueGoalCents(userId: string): Promise<number | null> {
  const prefs = await withCurrentUserScope((tx) => tx.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }))
  return prefs?.annualRevenueGoalCents ?? null
}

export async function getSentQuotesPipeline(userId: string) {
  const allQuotes = await listQuotes(userId)
  const sentQuotes = allQuotes.filter((quote) => quote.status === 'sent')
  return { quotes: sentQuotes, ...computeWeightedPipeline(sentQuotes) }
}

export async function getCashflowProjection(userId: string, horizonDays: number) {
  const [accounts, allInvoices, deadlines] = await Promise.all([listBankAccounts(), listInvoices(userId), listDeadlines()])

  const currentBalanceCents = accounts.filter((a) => !a.archivedAt).reduce((sum, a) => sum + a.balanceCents, 0)
  const outstandingInvoices = allInvoices
    .filter((invoice) => invoice.type !== 'credit_note' && invoice.totalTtcCents > invoice.paidAmountCents)
    .map((invoice) => ({ dueDate: invoice.dueDate, remainingCents: invoice.totalTtcCents - invoice.paidAmountCents }))
  const pendingDeadlines = deadlines
    .filter((deadline) => deadline.status === 'pending')
    .map((deadline) => ({ dueDate: deadline.dueDate, amountEstimateCents: deadline.amountEstimateCents }))

  return projectCashflow({
    currentBalanceCents,
    referenceDate: new Date().toISOString().slice(0, 10),
    horizonDays,
    outstandingInvoices,
    deadlines: pendingDeadlines,
  })
}
