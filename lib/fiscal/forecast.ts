/**
 * Calculs de prévisionnel — fonctions PURES, aucune date implicite (voir
 * PROMPT.md « les calculs fiscaux et de rentabilité sont des fonctions
 * pures »). `referenceDate` est toujours fourni par l'appelant.
 */

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type PipelineInput = { totalTtcCents: number; winProbabilityBasisPoints: number | null }

/**
 * Pipeline pondéré par les devis en cours. Un devis sans probabilité saisie
 * compte pour 100 % (jamais de probabilité inventée à sa place) : le total
 * pondéré et le total brut coïncident tant que l'utilisateur n'a rien estimé.
 */
export function computeWeightedPipeline(quotes: PipelineInput[]): { weightedCents: number; unweightedCents: number } {
  return quotes.reduce(
    (acc, quote) => {
      const weight = quote.winProbabilityBasisPoints != null ? quote.winProbabilityBasisPoints / 10_000 : 1
      return {
        weightedCents: acc.weightedCents + Math.round(quote.totalTtcCents * weight),
        unweightedCents: acc.unweightedCents + quote.totalTtcCents,
      }
    },
    { weightedCents: 0, unweightedCents: 0 },
  )
}

export type CashflowProjectionResult = {
  horizonDate: string
  projectedBalanceCents: number
  expectedInCents: number
  expectedOutCents: number
}

/**
 * Projection de trésorerie à un horizon donné : solde actuel + encours de
 * factures dont l'échéance tombe avant l'horizon - échéances de charges
 * estimées dans la même fenêtre. Ne prend en compte que ce qui a une date
 * connue ; une facture sans échéance ou une charge sans montant estimé est
 * ignorée plutôt que devinée.
 */
export function projectCashflow(input: {
  currentBalanceCents: number
  referenceDate: string
  horizonDays: number
  outstandingInvoices: { dueDate: string | null; remainingCents: number }[]
  deadlines: { dueDate: string; amountEstimateCents: number | null }[]
}): CashflowProjectionResult {
  const horizonDate = addDays(input.referenceDate, input.horizonDays)

  const expectedInCents = input.outstandingInvoices
    .filter((invoice) => invoice.dueDate && invoice.dueDate >= input.referenceDate && invoice.dueDate <= horizonDate)
    .reduce((sum, invoice) => sum + invoice.remainingCents, 0)

  const expectedOutCents = input.deadlines
    .filter((deadline) => deadline.amountEstimateCents != null && deadline.dueDate >= input.referenceDate && deadline.dueDate <= horizonDate)
    .reduce((sum, deadline) => sum + (deadline.amountEstimateCents ?? 0), 0)

  return {
    horizonDate,
    projectedBalanceCents: input.currentBalanceCents + expectedInCents - expectedOutCents,
    expectedInCents,
    expectedOutCents,
  }
}
