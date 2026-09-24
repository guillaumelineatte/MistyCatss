import { describe, expect, it } from 'vitest'

import { computeCompanyCharges, computeMicroCharges, computeThresholdGauge } from '../compute-charges'
import type { FiscalParamKey } from '../param-definitions'

// Paramètres entièrement fictifs, jamais des taux réels (PROMPT.md
// « interdiction d'inventer ») : ils servent uniquement à vérifier la
// formule, pas à documenter une valeur légale.
const microValues: Record<FiscalParamKey, number> = {
  ca_threshold_cents: 7_700_000,
  vat_franchise_threshold_cents: 3_600_000,
  cotisation_rate_bp: 2200, // 22,00 %
  versement_liberatoire_rate_bp: 0,
  formation_pro_rate_bp: 100, // 1,00 %
  income_tax_allowance_rate_bp: 3400,
  social_contribution_rate_bp: 0,
  is_reduced_rate_bp: 0,
  is_reduced_rate_threshold_cents: 0,
  is_normal_rate_bp: 0,
  cfe_minimum_cents: 0,
}

describe('computeMicroCharges', () => {
  it('calcule cotisations + formation pro sans versement libératoire', () => {
    const result = computeMicroCharges({ caEncaisseCents: 1_000_000, values: microValues })
    expect(result.cotisationsCents).toBe(220_000)
    expect(result.formationProCents).toBe(10_000)
    expect(result.incomeTaxCents).toBe(0)
    expect(result.totalChargesCents).toBe(230_000)
    expect(result.netCents).toBe(770_000)
  })

  it('inclut le versement libératoire quand son taux est non nul', () => {
    const result = computeMicroCharges({
      caEncaisseCents: 1_000_000,
      values: { ...microValues, versement_liberatoire_rate_bp: 220 },
    })
    expect(result.incomeTaxCents).toBe(22_000)
    expect(result.totalChargesCents).toBe(252_000)
    expect(result.netCents).toBe(748_000)
  })

  it('un CA nul ne produit aucune charge', () => {
    const result = computeMicroCharges({ caEncaisseCents: 0, values: microValues })
    expect(result.totalChargesCents).toBe(0)
    expect(result.netCents).toBe(0)
  })
})

const companyValues: Record<FiscalParamKey, number> = {
  ca_threshold_cents: 0,
  vat_franchise_threshold_cents: 3_600_000,
  cotisation_rate_bp: 0,
  versement_liberatoire_rate_bp: 0,
  formation_pro_rate_bp: 0,
  income_tax_allowance_rate_bp: 0,
  social_contribution_rate_bp: 4500, // 45,00 %
  is_reduced_rate_bp: 1500, // 15,00 %
  is_reduced_rate_threshold_cents: 4_250_000,
  is_normal_rate_bp: 2500, // 25,00 %
  cfe_minimum_cents: 50_000,
}

describe('computeCompanyCharges', () => {
  it('applique uniquement le taux réduit sous le plafond', () => {
    const result = computeCompanyCharges({ taxableProfitCents: 2_000_000, values: companyValues })
    expect(result.isCents).toBe(300_000) // 15 % de 2 000 000
    expect(result.netCompanyResultCents).toBe(1_700_000)
    expect(result.socialContributionsCents).toBe(765_000) // 45 % de 1 700 000
    expect(result.netDirigeantCents).toBe(935_000)
  })

  it('bascule sur le taux normal au-delà du plafond', () => {
    const result = computeCompanyCharges({ taxableProfitCents: 5_000_000, values: companyValues })
    // 4 250 000 à 15 % + 750 000 à 25 %
    expect(result.isCents).toBe(637_500 + 187_500)
  })

  it('un bénéfice nul ne produit aucun impôt ni charge', () => {
    const result = computeCompanyCharges({ taxableProfitCents: 0, values: companyValues })
    expect(result.isCents).toBe(0)
    expect(result.netDirigeantCents).toBe(0)
  })
})

describe('computeThresholdGauge', () => {
  it('calcule le ratio consommé et le reste avant le seuil', () => {
    const gauge = computeThresholdGauge(5_000_000, 7_700_000)
    expect(gauge.ratio).toBeCloseTo(0.6494, 4)
    expect(gauge.remainingCents).toBe(2_700_000)
  })

  it('un dépassement du seuil renvoie un reste à 0, pas négatif', () => {
    const gauge = computeThresholdGauge(9_000_000, 7_700_000)
    expect(gauge.remainingCents).toBe(0)
    expect(gauge.ratio).toBeGreaterThan(1)
  })

  it('un seuil absent (0) ne fait jamais diviser par zéro', () => {
    expect(computeThresholdGauge(1_000, 0)).toEqual({ ratio: 0, remainingCents: 0 })
  })
})
