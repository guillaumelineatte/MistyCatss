import { describe, expect, it } from 'vitest'

import { computeDocumentTotals, computeLineTotals, formatEuros } from '../money'

describe('computeLineTotals', () => {
  it('calcule HT/TVA/TTC sans remise', () => {
    const totals = computeLineTotals({ quantity: 2, unitPriceCents: 55000, vatRateBasisPoints: 2000 })
    expect(totals).toEqual({ lineTotalHtCents: 110000, vatCents: 22000, lineTotalTtcCents: 132000 })
  })

  it('applique une remise en pourcentage avant la TVA', () => {
    const totals = computeLineTotals({
      quantity: 1,
      unitPriceCents: 100000,
      discountPercentBasisPoints: 1000, // 10 %
      vatRateBasisPoints: 2000,
    })
    expect(totals.lineTotalHtCents).toBe(90000)
    expect(totals.vatCents).toBe(18000)
  })

  it('applique une remise en montant fixe', () => {
    const totals = computeLineTotals({
      quantity: 1,
      unitPriceCents: 100000,
      discountAmountCents: 5000,
      vatRateBasisPoints: 2000,
    })
    expect(totals.lineTotalHtCents).toBe(95000)
  })

  it('arrondit au centime le plus proche', () => {
    // 3 × 33.33€ = 99.99€, TVA 20% = 19.998€ -> arrondi à 20.00€
    const totals = computeLineTotals({ quantity: 3, unitPriceCents: 3333, vatRateBasisPoints: 2000 })
    expect(totals.vatCents).toBe(2000)
  })
})

describe('computeDocumentTotals', () => {
  it('arrondit ligne par ligne puis additionne, pas l\'inverse', () => {
    // Deux lignes à 0.333€ HT chacune, TVA 20% : arrondie ligne par ligne
    // 33 centimes × 20% = 6.6 -> 7 centimes par ligne, total TVA = 14.
    // Une somme HT globale (66 centimes) x 20% donnerait 13.2 -> 13, différent.
    const totals = computeDocumentTotals([
      { quantity: 1, unitPriceCents: 33, vatRateBasisPoints: 2000 },
      { quantity: 1, unitPriceCents: 33, vatRateBasisPoints: 2000 },
    ])
    expect(totals.totalVatCents).toBe(14)
  })

  it('additionne plusieurs lignes à taux de TVA différents', () => {
    const totals = computeDocumentTotals([
      { quantity: 1, unitPriceCents: 10000, vatRateBasisPoints: 2000 },
      { quantity: 1, unitPriceCents: 10000, vatRateBasisPoints: 550 },
    ])
    expect(totals).toEqual({ totalHtCents: 20000, totalVatCents: 2550, totalTtcCents: 22550 })
  })
})

describe('formatEuros', () => {
  it('formate en fr-FR avec le symbole €', () => {
    expect(formatEuros(123456)).toMatch(/1\s?234,56\s?€/)
  })
})
