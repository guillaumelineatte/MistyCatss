import { describe, expect, it } from 'vitest'

import { computeWeightedPipeline, projectCashflow } from '../forecast'

describe('computeWeightedPipeline', () => {
  it("pondère chaque devis par sa probabilité quand elle est renseignée", () => {
    const result = computeWeightedPipeline([
      { totalTtcCents: 100_000, winProbabilityBasisPoints: 5000 }, // 50 %
      { totalTtcCents: 200_000, winProbabilityBasisPoints: 8000 }, // 80 %
    ])
    expect(result.unweightedCents).toBe(300_000)
    expect(result.weightedCents).toBe(50_000 + 160_000)
  })

  it('compte un devis sans probabilité saisie pour 100 % (jamais inventée)', () => {
    const result = computeWeightedPipeline([{ totalTtcCents: 100_000, winProbabilityBasisPoints: null }])
    expect(result.weightedCents).toBe(100_000)
    expect(result.weightedCents).toBe(result.unweightedCents)
  })

  it('une liste vide renvoie des totaux nuls', () => {
    expect(computeWeightedPipeline([])).toEqual({ weightedCents: 0, unweightedCents: 0 })
  })
})

describe('projectCashflow', () => {
  it('ajoute les encours et soustrait les échéances dans la fenêtre', () => {
    const result = projectCashflow({
      currentBalanceCents: 1_000_000,
      referenceDate: '2026-01-01',
      horizonDays: 90,
      outstandingInvoices: [
        { dueDate: '2026-02-01', remainingCents: 200_000 }, // dans la fenêtre
        { dueDate: '2026-06-01', remainingCents: 500_000 }, // hors fenêtre
        { dueDate: null, remainingCents: 999_000 }, // sans échéance, ignorée
      ],
      deadlines: [
        { dueDate: '2026-03-15', amountEstimateCents: 150_000 }, // dans la fenêtre
        { dueDate: '2026-03-20', amountEstimateCents: null }, // montant non estimé, ignorée
        { dueDate: '2026-09-01', amountEstimateCents: 400_000 }, // hors fenêtre
      ],
    })
    expect(result.expectedInCents).toBe(200_000)
    expect(result.expectedOutCents).toBe(150_000)
    expect(result.projectedBalanceCents).toBe(1_000_000 + 200_000 - 150_000)
    expect(result.horizonDate).toBe('2026-04-01')
  })

  it('sans mouvement dans la fenêtre, le solde projeté est inchangé', () => {
    const result = projectCashflow({
      currentBalanceCents: 500_000,
      referenceDate: '2026-01-01',
      horizonDays: 30,
      outstandingInvoices: [],
      deadlines: [],
    })
    expect(result.projectedBalanceCents).toBe(500_000)
  })
})
