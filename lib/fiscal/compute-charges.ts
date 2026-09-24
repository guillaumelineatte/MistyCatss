import { applyRateBasisPoints } from '@/lib/money'
import type { FiscalParamKey } from './param-definitions'

export type MicroChargesResult = {
  cotisationsCents: number
  formationProCents: number
  incomeTaxCents: number
  totalChargesCents: number
  netCents: number
}

/**
 * Charges d'une période en micro-entreprise. Fonction PURE : reçoit le CA
 * ENCAISSÉ (pas facturé — les cotisations micro sont dues sur l'encaissé) et
 * des paramètres déjà résolus (voir lib/fiscal/get-params.ts ; n'est jamais
 * appelée tant que `getFiscalParams` renvoie `missing_params`). Un taux de
 * versement libératoire à 0 signifie simplement que l'option n'est pas
 * exercée — pas un cas particulier à traiter séparément.
 */
export function computeMicroCharges(input: {
  caEncaisseCents: number
  values: Record<FiscalParamKey, number>
}): MicroChargesResult {
  const { caEncaisseCents, values } = input
  const cotisationsCents = applyRateBasisPoints(caEncaisseCents, values.cotisation_rate_bp)
  const formationProCents = applyRateBasisPoints(caEncaisseCents, values.formation_pro_rate_bp)
  const incomeTaxCents = applyRateBasisPoints(caEncaisseCents, values.versement_liberatoire_rate_bp)
  const totalChargesCents = cotisationsCents + formationProCents + incomeTaxCents
  return {
    cotisationsCents,
    formationProCents,
    incomeTaxCents,
    totalChargesCents,
    netCents: caEncaisseCents - totalChargesCents,
  }
}

export type CompanyChargesResult = {
  isCents: number
  netCompanyResultCents: number
  socialContributionsCents: number
  netDirigeantCents: number
}

/**
 * Charges d'une période en EURL/SASU. Simplification assumée du simulateur
 * (comparatif, pas une liasse fiscale) : le bénéfice imposable est pris égal
 * au CA fourni (aucune charge déductible modélisée dans l'app), et 100 % du
 * résultat net après IS est supposé versé au dirigeant en rémunération
 * soumise à `social_contribution_rate_bp` — pas de répartition
 * rémunération/dividendes, pas de CFE déduite. Documenté dans CLAUDE.md.
 */
export function computeCompanyCharges(input: {
  taxableProfitCents: number
  values: Record<FiscalParamKey, number>
}): CompanyChargesResult {
  const { taxableProfitCents, values } = input
  const reducedBaseCents = Math.max(0, Math.min(taxableProfitCents, values.is_reduced_rate_threshold_cents))
  const normalBaseCents = Math.max(0, taxableProfitCents - values.is_reduced_rate_threshold_cents)
  const isCents = applyRateBasisPoints(reducedBaseCents, values.is_reduced_rate_bp) + applyRateBasisPoints(normalBaseCents, values.is_normal_rate_bp)
  const netCompanyResultCents = taxableProfitCents - isCents
  const socialContributionsCents = applyRateBasisPoints(netCompanyResultCents, values.social_contribution_rate_bp)
  return {
    isCents,
    netCompanyResultCents,
    socialContributionsCents,
    netDirigeantCents: netCompanyResultCents - socialContributionsCents,
  }
}

/** Jauge de seuil générique (plafond micro, franchise en base de TVA…). */
export function computeThresholdGauge(realizedCents: number, thresholdCents: number): { ratio: number; remainingCents: number } {
  if (thresholdCents <= 0) return { ratio: 0, remainingCents: 0 }
  return { ratio: realizedCents / thresholdCents, remainingCents: Math.max(0, thresholdCents - realizedCents) }
}
