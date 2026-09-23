/**
 * Centralise toute arithmétique monétaire : montants en centimes entiers,
 * jamais de float. Taux en points de base entiers (2000 = 20,00 %).
 */

export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

/** Applique un taux en points de base à un montant en centimes, arrondi au centime. */
export function applyRateBasisPoints(amountCents: number, rateBasisPoints: number): number {
  return Math.round((amountCents * rateBasisPoints) / 10_000)
}

export type LineInput = {
  quantity: number
  unitPriceCents: number
  discountPercentBasisPoints?: number | null
  discountAmountCents?: number | null
  vatRateBasisPoints: number
}

export type LineTotals = {
  lineTotalHtCents: number
  vatCents: number
  lineTotalTtcCents: number
}

/**
 * Calcule le total HT d'une ligne : quantité × prix unitaire, puis remise
 * (pourcentage OU montant, jamais les deux — le pourcentage est prioritaire
 * si les deux sont renseignés par erreur), arrondi au centime.
 */
export function computeLineTotals(line: LineInput): LineTotals {
  const grossCents = Math.round(line.quantity * line.unitPriceCents)
  let lineTotalHtCents = grossCents

  if (line.discountPercentBasisPoints) {
    lineTotalHtCents = grossCents - applyRateBasisPoints(grossCents, line.discountPercentBasisPoints)
  } else if (line.discountAmountCents) {
    lineTotalHtCents = grossCents - line.discountAmountCents
  }

  const vatCents = applyRateBasisPoints(lineTotalHtCents, line.vatRateBasisPoints)
  return { lineTotalHtCents, vatCents, lineTotalTtcCents: lineTotalHtCents + vatCents }
}

export type DocumentTotals = {
  totalHtCents: number
  totalVatCents: number
  totalTtcCents: number
}

/**
 * Règle fiscale française d'arrondi de TVA : arrondi au centime le plus
 * proche, LIGNE PAR LIGNE, puis somme des lignes déjà arrondies — jamais
 * l'inverse (somme des HT non arrondis puis un seul arrondi global), qui
 * peut produire un total TTC different de la somme des lignes affichées.
 */
export function computeDocumentTotals(lines: LineInput[]): DocumentTotals {
  return lines.reduce<DocumentTotals>(
    (totals, line) => {
      const { lineTotalHtCents, vatCents, lineTotalTtcCents } = computeLineTotals(line)
      return {
        totalHtCents: totals.totalHtCents + lineTotalHtCents,
        totalVatCents: totals.totalVatCents + vatCents,
        totalTtcCents: totals.totalTtcCents + lineTotalTtcCents,
      }
    },
    { totalHtCents: 0, totalVatCents: 0, totalTtcCents: 0 },
  )
}
