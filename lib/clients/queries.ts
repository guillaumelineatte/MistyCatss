import 'server-only'

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { clients, invoicePayments, invoices } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export async function listClients(includeArchived = false) {
  return withCurrentUserScope((tx) =>
    tx
      .select()
      .from(clients)
      .where(includeArchived ? undefined : isNull(clients.archivedAt))
      .orderBy(asc(clients.name)),
  )
}

export async function getClient(id: string) {
  return withCurrentUserScope((tx) => tx.query.clients.findFirst({ where: eq(clients.id, id) }))
}

export type ClientIndicators = {
  totalCaCents: number
  outstandingCents: number
  averagePaymentDelayDays: number | null
  shareOfTotalCaBasisPoints: number
  isDependencyRisk: boolean
}

/**
 * CA cumulé, encours, délai de paiement moyen et part du CA total pour un
 * client — calculés à la volée à partir des factures ÉMISES (status != draft
 * ni cancelled), jamais stockés (ils évoluent avec chaque facture/paiement).
 * Les avoirs (type = 'credit_note') sont soustraits du CA, jamais additionnés.
 */
export async function getClientIndicators(clientId: string): Promise<ClientIndicators> {
  return withCurrentUserScope(async (tx) => {
    const issuedStatuses = ['issued', 'sent', 'partially_paid', 'paid', 'overdue'] as const
    // Somme signée : une ligne credit_note compte négativement dans le CA.
    const signedTtc = sql<string>`coalesce(sum(case when ${invoices.type} = 'credit_note' then -${invoices.totalTtcCents} else ${invoices.totalTtcCents} end), 0)`
    const signedPaid = sql<string>`coalesce(sum(case when ${invoices.type} = 'credit_note' then -${invoices.paidAmountCents} else ${invoices.paidAmountCents} end), 0)`

    const [clientTotals] = await tx
      .select({ totalTtc: signedTtc, totalPaid: signedPaid })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), inArray(invoices.status, [...issuedStatuses])))

    const [allClientsTotals] = await tx
      .select({ totalTtc: signedTtc })
      .from(invoices)
      .where(inArray(invoices.status, [...issuedStatuses]))

    const paymentDelays = await tx
      .select({
        issueDate: invoices.issueDate,
        paidAt: invoicePayments.paidAt,
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(eq(invoices.clientId, clientId))

    const delaysInDays = paymentDelays
      .filter((row) => row.issueDate)
      .map((row) => {
        const issued = new Date(row.issueDate!)
        const paid = new Date(row.paidAt)
        return Math.round((paid.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
      })

    const totalCaCents = Number(clientTotals?.totalTtc ?? 0)
    const outstandingCents = totalCaCents - Number(clientTotals?.totalPaid ?? 0)
    const totalAllCents = Number(allClientsTotals?.totalTtc ?? 0)
    const shareOfTotalCaBasisPoints = totalAllCents > 0 ? Math.round((totalCaCents / totalAllCents) * 10_000) : 0

    return {
      totalCaCents,
      outstandingCents,
      averagePaymentDelayDays:
        delaysInDays.length > 0 ? Math.round(delaysInDays.reduce((a, b) => a + b, 0) / delaysInDays.length) : null,
      shareOfTotalCaBasisPoints,
      isDependencyRisk: shareOfTotalCaBasisPoints >= 3000, // seuil UI (30 %), pas une valeur fiscale
    }
  })
}

/** Détection de doublons simple : SIRET identique ou nom identique (insensible à la casse). */
export async function findPotentialDuplicate(name: string, siret: string | null | undefined) {
  return withCurrentUserScope((tx) =>
    tx.query.clients.findFirst({
      where: siret
        ? sql`(lower(${clients.name}) = lower(${name}) or ${clients.siret} = ${siret})`
        : sql`lower(${clients.name}) = lower(${name})`,
    }),
  )
}
