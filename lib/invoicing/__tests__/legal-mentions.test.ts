import { describe, expect, it } from 'vitest'

import type { companies, statusPeriods } from '@/db/schema'
import { resolveLegalMentions } from '../legal-mentions'

type Company = typeof companies.$inferSelect
type StatusPeriod = typeof statusPeriods.$inferSelect

const fullCompany: Company = {
  userId: 'u1',
  legalName: 'Test SARL',
  siret: '12345678900012',
  siren: '123456789',
  vatNumber: 'FR12345678900',
  addressLine1: '1 rue Fictive',
  addressLine2: null,
  postalCode: '75000',
  city: 'Paris',
  country: 'FR',
  iban: null,
  bic: null,
  rcsCity: 'Paris',
  shareCapitalCents: 100000,
  phone: null,
  email: null,
  website: null,
  logoFileId: null,
  defaultEscompteConditions: "Pas d'escompte",
  defaultLatePenaltyRateBasisPoints: 300,
  defaultLateRecoveryIndemnityCents: 4000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const franchisePeriod: StatusPeriod = {
  id: 'p1',
  userId: 'u1',
  status: 'micro',
  vatRegime: 'franchise',
  startDate: '2024-01-01',
  endDate: null,
  createdAt: new Date(),
}

const reelPeriod: StatusPeriod = { ...franchisePeriod, vatRegime: 'reel_simplifie', status: 'eurl' }

describe('resolveLegalMentions', () => {
  it('renvoie ok quand tout est renseigné (régime franchise)', () => {
    const result = resolveLegalMentions({ company: fullCompany, statusPeriodAtDate: franchisePeriod })
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.mentions.vatMention).toMatch(/franchise|293 B/)
    }
  })

  it('exige un numéro de TVA en régime réel, pas en franchise', () => {
    const withoutVat = { ...fullCompany, vatNumber: null }
    const franchiseResult = resolveLegalMentions({ company: withoutVat, statusPeriodAtDate: franchisePeriod })
    expect(franchiseResult.status).toBe('ok')

    const reelResult = resolveLegalMentions({ company: withoutVat, statusPeriodAtDate: reelPeriod })
    expect(reelResult.status).toBe('missing_params')
    if (reelResult.status === 'missing_params') {
      expect(reelResult.missing).toContain('Numéro de TVA intracommunautaire')
    }
  })

  it("signale l'absence de statut juridique à la date, sans planter", () => {
    const result = resolveLegalMentions({ company: fullCompany, statusPeriodAtDate: null })
    expect(result.status).toBe('missing_params')
    if (result.status === 'missing_params') {
      expect(result.missing).toContain('Statut juridique à la date de la facture')
    }
  })

  it("signale chaque mention manquante sans jamais inventer de valeur", () => {
    const result = resolveLegalMentions({ company: null, statusPeriodAtDate: null })
    expect(result.status).toBe('missing_params')
    if (result.status === 'missing_params') {
      expect(result.missing).toEqual(
        expect.arrayContaining([
          'Statut juridique à la date de la facture',
          "Raison sociale de l'entreprise",
          'SIRET',
          "Conditions d'escompte",
          'Taux des pénalités de retard',
          'Indemnité forfaitaire de recouvrement',
        ]),
      )
      expect(result.mentions.sellerLegalName).toBeUndefined()
    }
  })
})
