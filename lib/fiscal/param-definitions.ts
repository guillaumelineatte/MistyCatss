import type { StatutJuridique } from '@/db/schema'

export type FiscalParamUnit = 'basis_points' | 'cents'

export type FiscalParamKey =
  | 'ca_threshold_cents'
  | 'vat_franchise_threshold_cents'
  | 'cotisation_rate_bp'
  | 'versement_liberatoire_rate_bp'
  | 'formation_pro_rate_bp'
  | 'income_tax_allowance_rate_bp'
  | 'social_contribution_rate_bp'
  | 'is_reduced_rate_bp'
  | 'is_reduced_rate_threshold_cents'
  | 'is_normal_rate_bp'
  | 'cfe_minimum_cents'

export type FiscalParamDefinition = {
  key: FiscalParamKey
  label: string
  description: string
  unit: FiscalParamUnit
  statuses: readonly StatutJuridique[]
}

/**
 * Source de vérité unique pour les paramètres fiscaux : nom, unité, statuts
 * concernés. `lib/fiscal/params/<année>.ts` s'en sert pour construire la
 * structure par défaut (toutes valeurs à null) ; l'interface des paramètres
 * avancés (Phase 4+) s'en sert pour générer les champs de saisie. Ajouter un
 * paramètre ici, jamais lui inventer de valeur.
 */
export const FISCAL_PARAM_DEFINITIONS: readonly FiscalParamDefinition[] = [
  {
    key: 'ca_threshold_cents',
    label: "Plafond de chiffre d'affaires annuel",
    description: "Seuil au-delà duquel le régime micro-entreprise n'est plus applicable, en centimes.",
    unit: 'cents',
    statuses: ['micro'],
  },
  {
    key: 'vat_franchise_threshold_cents',
    label: 'Seuil de franchise en base de TVA',
    description: "Chiffre d'affaires annuel au-delà duquel la franchise en base de TVA cesse de s'appliquer, en centimes.",
    unit: 'cents',
    statuses: ['micro', 'eurl', 'sasu'],
  },
  {
    key: 'cotisation_rate_bp',
    label: 'Taux de cotisations sociales',
    description: "Taux de cotisations sociales appliqué au chiffre d'affaires encaissé, en points de base (2000 = 20,00 %).",
    unit: 'basis_points',
    statuses: ['micro'],
  },
  {
    key: 'versement_liberatoire_rate_bp',
    label: 'Taux du versement fiscal libératoire',
    description: "Taux optionnel de versement libératoire de l'impôt sur le revenu, en points de base. Laisser vide si l'option n'est pas exercée.",
    unit: 'basis_points',
    statuses: ['micro'],
  },
  {
    key: 'formation_pro_rate_bp',
    label: 'Taux de contribution à la formation professionnelle',
    description: "Taux de la contribution à la formation professionnelle, en points de base.",
    unit: 'basis_points',
    statuses: ['micro'],
  },
  {
    key: 'income_tax_allowance_rate_bp',
    label: "Taux d'abattement forfaitaire pour frais professionnels",
    description: "Taux d'abattement forfaitaire applicable au chiffre d'affaires pour le calcul du revenu imposable (barème IR), en points de base.",
    unit: 'basis_points',
    statuses: ['micro'],
  },
  {
    key: 'social_contribution_rate_bp',
    label: 'Taux effectif de charges sociales sur la rémunération du dirigeant',
    description: "Taux effectif de cotisations sociales sur la rémunération nette du dirigeant (TNS pour l'EURL, assimilé salarié pour la SASU), en points de base.",
    unit: 'basis_points',
    statuses: ['eurl', 'sasu'],
  },
  {
    key: 'is_reduced_rate_bp',
    label: "Taux réduit d'impôt sur les sociétés",
    description: "Taux réduit d'IS applicable jusqu'au plafond de bénéfice, en points de base.",
    unit: 'basis_points',
    statuses: ['eurl', 'sasu'],
  },
  {
    key: 'is_reduced_rate_threshold_cents',
    label: 'Plafond de bénéfice au taux réduit',
    description: "Montant de bénéfice imposable jusqu'auquel le taux réduit d'IS s'applique, en centimes.",
    unit: 'cents',
    statuses: ['eurl', 'sasu'],
  },
  {
    key: 'is_normal_rate_bp',
    label: "Taux normal d'impôt sur les sociétés",
    description: "Taux normal d'IS au-delà du plafond de bénéfice, en points de base.",
    unit: 'basis_points',
    statuses: ['eurl', 'sasu'],
  },
  {
    key: 'cfe_minimum_cents',
    label: 'Cotisation foncière des entreprises (base minimale)',
    description: "Montant de la base minimale de CFE. Variable selon la commune : à saisir manuellement, ne peut pas être déduit d'un barème national.",
    unit: 'cents',
    statuses: ['eurl', 'sasu'],
  },
] as const

export const FISCAL_PARAM_DEFINITIONS_BY_KEY: Record<FiscalParamKey, FiscalParamDefinition> = Object.fromEntries(
  FISCAL_PARAM_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<FiscalParamKey, FiscalParamDefinition>

export function paramKeysForStatus(status: StatutJuridique): FiscalParamKey[] {
  return FISCAL_PARAM_DEFINITIONS.filter((definition) => definition.statuses.includes(status)).map(
    (definition) => definition.key,
  )
}
