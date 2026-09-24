import type { companies, statusPeriods } from '@/db/schema'

type Company = typeof companies.$inferSelect
type StatusPeriod = typeof statusPeriods.$inferSelect

export type LegalMentions = {
  sellerLegalName: string
  sellerSiret: string
  sellerAddress: string | null
  vatMention: string
  escompteConditions: string
  latePenaltyRateBasisPoints: number
  lateRecoveryIndemnityCents: number
  statutJuridique: StatusPeriod['status']
  vatRegime: StatusPeriod['vatRegime']
}

export type LegalMentionsResult =
  | { status: 'ok'; mentions: LegalMentions }
  | { status: 'missing_params'; missing: string[]; mentions: Partial<LegalMentions> }

/**
 * Fonction PURE : résout les mentions légales obligatoires d'une facture à
 * partir de l'entreprise et du statut juridique EN VIGUEUR À LA DATE
 * donnée (jamais le statut "actuel"). Ne va jamais chercher la base
 * elle-même (voir lib/invoicing/actions.ts pour la résolution du
 * statusPeriod applicable) et ne lève jamais d'exception : renvoie un
 * résultat typé que l'interface sait afficher (bandeau d'avertissement),
 * cf. PROMPT.md « Comportement en l'absence de paramètre ».
 */
export function resolveLegalMentions(params: {
  company: Company | null
  statusPeriodAtDate: StatusPeriod | null
}): LegalMentionsResult {
  const { company, statusPeriodAtDate } = params
  const missing: string[] = []

  if (!statusPeriodAtDate) missing.push('Statut juridique à la date de la facture')
  if (!company?.legalName) missing.push("Raison sociale de l'entreprise")
  if (!company?.siret) missing.push('SIRET')

  const isFranchise = statusPeriodAtDate?.vatRegime === 'franchise'
  if (!isFranchise && statusPeriodAtDate && !company?.vatNumber) {
    missing.push('Numéro de TVA intracommunautaire')
  }

  if (!company?.defaultEscompteConditions) missing.push("Conditions d'escompte")
  if (company?.defaultLatePenaltyRateBasisPoints == null) missing.push('Taux des pénalités de retard')
  if (company?.defaultLateRecoveryIndemnityCents == null) missing.push('Indemnité forfaitaire de recouvrement')

  const partialMentions: Partial<LegalMentions> = {
    sellerLegalName: company?.legalName ?? undefined,
    sellerSiret: company?.siret ?? undefined,
    sellerAddress: company ? [company.addressLine1, company.postalCode, company.city].filter(Boolean).join(' ') : undefined,
    vatMention: isFranchise
      ? 'TVA non applicable, art. 293 B du CGI'
      : company?.vatNumber
        ? `TVA intracommunautaire : ${company.vatNumber}`
        : undefined,
    escompteConditions: company?.defaultEscompteConditions ?? undefined,
    latePenaltyRateBasisPoints: company?.defaultLatePenaltyRateBasisPoints ?? undefined,
    lateRecoveryIndemnityCents: company?.defaultLateRecoveryIndemnityCents ?? undefined,
    statutJuridique: statusPeriodAtDate?.status,
    vatRegime: statusPeriodAtDate?.vatRegime,
  }

  if (missing.length > 0) {
    return { status: 'missing_params', missing, mentions: partialMentions }
  }

  return { status: 'ok', mentions: partialMentions as LegalMentions }
}
