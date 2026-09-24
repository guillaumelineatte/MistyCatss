'use client'

import { useActionState, useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { companies, numberingSeries, statusPeriods, userPreferences } from '@/db/schema'
import {
  createStatusPeriodAction,
  updateCompanyAction,
  updatePreferencesAction,
  upsertNumberingSeriesAction,
  type ActionResult,
} from '@/lib/settings/actions'

type Company = typeof companies.$inferSelect
type StatusPeriod = typeof statusPeriods.$inferSelect
type Preferences = typeof userPreferences.$inferSelect
type NumberingSeries = typeof numberingSeries.$inferSelect

const initialState: ActionResult = {}

const statusLabels: Record<string, string> = { micro: 'Micro-entreprise', eurl: 'EURL', sasu: 'SASU' }
const vatLabels: Record<string, string> = {
  franchise: 'Franchise en base',
  reel_simplifie: 'Réel simplifié',
  reel_normal: 'Réel normal',
}

function Card({ title, tone, children }: { title: string; tone?: 'pink' | 'blue'; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
      <SectionLabel tone={tone}>{title}</SectionLabel>
      {children}
    </div>
  )
}

export function GeneralSettings({
  company,
  periods,
  preferences,
  series,
}: {
  company: Company | null
  periods: StatusPeriod[]
  preferences: Preferences | null
  series: NumberingSeries[]
}) {
  return (
    <div className="flex flex-col gap-8">
      <CompanyCard company={company} />
      <StatusPeriodsCard periods={periods} />
      <PreferencesCard preferences={preferences} />
      <NumberingSeriesCard series={series} />
    </div>
  )
}

function CompanyCard({ company }: { company: Company | null }) {
  const [state, action, pending] = useActionState(updateCompanyAction, initialState)

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
        <div>
          <SectionLabel tone="blue">Profil entreprise</SectionLabel>
          <h2 className="mt-4 text-5xl">TES INFOS</h2>
        </div>
        <ButtonPrimary>{pending ? 'Enregistrement…' : 'Enregistrer'}</ButtonPrimary>
      </div>
      <form action={action} className="contents">
        {state.error && <div className="mt-5"><FormError message={state.error} /></div>}
        {state.success && <p className="mt-5 font-mono text-xs text-[var(--blue)]">Enregistré.</p>}
        <div className="grid gap-5 py-6 md:grid-cols-2">
          <Field label="Nom de l'entreprise" htmlFor="legalName">
            <input id="legalName" name="legalName" defaultValue={company?.legalName ?? ''} className={inputClassName} />
          </Field>
          <Field label="Email professionnel" htmlFor="email">
            <input id="email" name="email" type="email" defaultValue={company?.email ?? ''} className={inputClassName} />
          </Field>
          <Field label="SIRET" htmlFor="siret">
            <input id="siret" name="siret" defaultValue={company?.siret ?? ''} className={inputClassName} />
          </Field>
          <Field label="TVA intracommunautaire" htmlFor="vatNumber">
            <input id="vatNumber" name="vatNumber" defaultValue={company?.vatNumber ?? ''} className={inputClassName} />
          </Field>
          <Field label="Adresse" htmlFor="addressLine1">
            <input id="addressLine1" name="addressLine1" defaultValue={company?.addressLine1 ?? ''} className={inputClassName} />
          </Field>
          <Field label="Complément d'adresse" htmlFor="addressLine2">
            <input id="addressLine2" name="addressLine2" defaultValue={company?.addressLine2 ?? ''} className={inputClassName} />
          </Field>
          <Field label="Code postal" htmlFor="postalCode">
            <input id="postalCode" name="postalCode" defaultValue={company?.postalCode ?? ''} className={inputClassName} />
          </Field>
          <Field label="Ville" htmlFor="city">
            <input id="city" name="city" defaultValue={company?.city ?? ''} className={inputClassName} />
          </Field>
          <Field label="IBAN" htmlFor="iban">
            <input id="iban" name="iban" defaultValue={company?.iban ?? ''} className={inputClassName} />
          </Field>
          <Field label="BIC" htmlFor="bic">
            <input id="bic" name="bic" defaultValue={company?.bic ?? ''} className={inputClassName} />
          </Field>
          <Field label="Ville du RCS (EURL/SASU)" htmlFor="rcsCity">
            <input id="rcsCity" name="rcsCity" defaultValue={company?.rcsCity ?? ''} className={inputClassName} />
          </Field>
          <Field label="Capital social — € (EURL/SASU)" htmlFor="shareCapital">
            <input
              id="shareCapital"
              name="shareCapital"
              type="number"
              step="0.01"
              defaultValue={company?.shareCapitalCents != null ? company.shareCapitalCents / 100 : ''}
              className={inputClassName}
            />
          </Field>
          <Field label="Téléphone" htmlFor="phone">
            <input id="phone" name="phone" defaultValue={company?.phone ?? ''} className={inputClassName} />
          </Field>
          <Field label="Site web" htmlFor="website">
            <input id="website" name="website" defaultValue={company?.website ?? ''} className={inputClassName} />
          </Field>
        </div>

        <div className="border-t-2 border-[var(--ink)] pt-6">
          <SectionLabel tone="pink">Mentions légales factures</SectionLabel>
          <p className="mt-3 max-w-xl font-mono text-xs text-[var(--ink)]/60">
            Valeurs par défaut reprises sur chaque facture à l&apos;émission. Laissées vides, la facture s&apos;émet
            quand même — un bandeau dans l&apos;app signale la mention manquante.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Conditions d'escompte" htmlFor="defaultEscompteConditions">
              <input
                id="defaultEscompteConditions"
                name="defaultEscompteConditions"
                placeholder="Ex. Pas d'escompte pour paiement anticipé"
                defaultValue={company?.defaultEscompteConditions ?? ''}
                className={inputClassName}
              />
            </Field>
            <Field label="Taux de pénalités de retard — %" htmlFor="defaultLatePenaltyRate">
              <input
                id="defaultLatePenaltyRate"
                name="defaultLatePenaltyRate"
                type="number"
                step="0.01"
                defaultValue={company?.defaultLatePenaltyRateBasisPoints != null ? company.defaultLatePenaltyRateBasisPoints / 100 : ''}
                className={inputClassName}
              />
            </Field>
            <Field label="Indemnité forfaitaire de recouvrement — €" htmlFor="defaultLateRecoveryIndemnity">
              <input
                id="defaultLateRecoveryIndemnity"
                name="defaultLateRecoveryIndemnity"
                type="number"
                step="0.01"
                defaultValue={company?.defaultLateRecoveryIndemnityCents != null ? company.defaultLateRecoveryIndemnityCents / 100 : ''}
                className={inputClassName}
              />
            </Field>
          </div>
        </div>
      </form>
    </div>
  )
}

function StatusPeriodsCard({ periods }: { periods: StatusPeriod[] }) {
  const [state, action, pending] = useActionState(createStatusPeriodAction, initialState)
  const current = periods.find((p) => !p.endDate)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
        <SectionLabel tone="blue">Statut juridique</SectionLabel>
        <h2 className="mt-4 text-4xl">HISTORIQUE DES PÉRIODES</h2>
        {periods.length === 0 && (
          <p className="mt-4 font-mono text-xs text-[var(--ink)]/70">
            Aucune période renseignée. Tant que ce n&apos;est pas fait, les écrans qui dépendent du statut te
            proposeront de le renseigner, sans bloquer le reste.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 font-mono text-xs">
          {periods.map((period) => (
            <div key={period.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-3">
              <div>
                <p className="font-bold">{statusLabels[period.status]}</p>
                <p className="text-[var(--ink)]/60">{vatLabels[period.vatRegime]}</p>
              </div>
              <span>
                {period.startDate.split('-').reverse().join('/')} —{' '}
                {period.endDate ? period.endDate.split('-').reverse().join('/') : 'en cours'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-[3px] border-[var(--ink)] bg-[var(--pink)] p-6 shadow-[8px_8px_0_var(--ink)]">
        <h2 className="text-5xl text-[var(--paper)]">{current ? 'CHANGEMENT DE STATUT' : 'DÉFINIR UN STATUT'}</h2>
        <p className="mt-4 max-w-2xl font-mono text-sm text-[var(--paper)]">
          L&apos;historique antérieur garde les règles de sa période. Le nouveau statut s&apos;applique à partir de
          la date choisie.
        </p>
        {!open ? (
          <div className="mt-6">
            <ButtonSecondary onClick={() => setOpen(true)}>
              <ArrowUpRight className="size-4" /> {current ? 'Préparer le changement' : 'Renseigner le statut'}
            </ButtonSecondary>
          </div>
        ) : (
          <form action={action} className="mt-6 flex flex-col gap-4">
            {state.error && <FormError message={state.error} />}
            <div className="flex flex-wrap gap-4">
              <Field label="Statut" htmlFor="status">
                <select id="status" name="status" defaultValue="micro" className={inputClassName}>
                  <option value="micro">Micro-entreprise</option>
                  <option value="eurl">EURL</option>
                  <option value="sasu">SASU</option>
                </select>
              </Field>
              <Field label="Régime de TVA" htmlFor="vatRegime">
                <select id="vatRegime" name="vatRegime" defaultValue="franchise" className={inputClassName}>
                  <option value="franchise">Franchise en base</option>
                  <option value="reel_simplifie">Réel simplifié</option>
                  <option value="reel_normal">Réel normal</option>
                </select>
              </Field>
              <Field label="Date d'effet" htmlFor="startDate">
                <input id="startDate" name="startDate" type="date" required className={inputClassName} />
              </Field>
            </div>
            <div className="flex gap-3">
              <ButtonSecondary>{pending ? 'Enregistrement…' : 'Confirmer'}</ButtonSecondary>
              <button type="button" onClick={() => setOpen(false)} className="font-mono text-xs text-[var(--paper)] underline">
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function PreferencesCard({ preferences }: { preferences: Preferences | null }) {
  const [state, action, pending] = useActionState(updatePreferencesAction, initialState)
  return (
    <Card title="Préférences" tone="blue">
      <h2 className="mt-4 text-3xl">TJM & CONDITIONS PAR DÉFAUT</h2>
      <form action={action} className="mt-5 flex flex-col gap-4">
        {state.error && <FormError message={state.error} />}
        {state.success && <p className="font-mono text-xs text-[var(--blue)]">Enregistré.</p>}
        <div className="flex flex-wrap gap-4">
          <Field label="TJM par défaut — €" htmlFor="defaultDailyRate">
            <input
              id="defaultDailyRate"
              name="defaultDailyRate"
              type="number"
              step="0.01"
              defaultValue={preferences?.defaultDailyRateCents != null ? preferences.defaultDailyRateCents / 100 : ''}
              className={inputClassName}
            />
          </Field>
          <Field label="Délai de paiement par défaut — jours" htmlFor="defaultPaymentTermsDays">
            <input
              id="defaultPaymentTermsDays"
              name="defaultPaymentTermsDays"
              type="number"
              defaultValue={preferences?.defaultPaymentTermsDays ?? 30}
              className={inputClassName}
            />
          </Field>
        </div>
        <div>
          <ButtonSecondary>{pending ? 'Enregistrement…' : 'Enregistrer'}</ButtonSecondary>
        </div>
      </form>
    </Card>
  )
}

function NumberingSeriesCard({ series }: { series: NumberingSeries[] }) {
  const [state, action, pending] = useActionState(upsertNumberingSeriesAction, initialState)
  const invoiceSeries = series.find((s) => s.kind === 'invoice')
  const quoteSeries = series.find((s) => s.kind === 'quote')

  return (
    <Card title="Numérotation">
      <h2 className="mt-4 text-3xl">SÉRIES DE NUMÉROTATION</h2>
      <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">
        Factures : {invoiceSeries ? `${invoiceSeries.prefix}${invoiceSeries.yearlyReset ? ' · remise à zéro annuelle' : ''}` : 'non configurée'} ·
        Devis : {quoteSeries ? `${quoteSeries.prefix}${quoteSeries.yearlyReset ? ' · remise à zéro annuelle' : ''}` : 'non configurée'}
      </p>
      <form action={action} className="mt-5 flex flex-wrap items-end gap-4">
        {state.error && <FormError message={state.error} />}
        <Field label="Type" htmlFor="kind">
          <select id="kind" name="kind" defaultValue="invoice" className={inputClassName}>
            <option value="invoice">Factures</option>
            <option value="quote">Devis</option>
            <option value="credit_note">Avoirs</option>
          </select>
        </Field>
        <Field label="Préfixe" htmlFor="prefix">
          <input id="prefix" name="prefix" defaultValue="F" maxLength={8} required className={inputClassName} />
        </Field>
        <Field label="Chiffres" htmlFor="paddingLength">
          <input id="paddingLength" name="paddingLength" type="number" defaultValue={3} min={1} max={10} className={inputClassName} />
        </Field>
        <label className="flex items-center gap-2 font-mono text-xs uppercase">
          <input type="checkbox" name="yearlyReset" defaultChecked /> Remise à zéro annuelle
        </label>
        <ButtonSecondary>
          <Check className="size-4" /> {pending ? '…' : 'Enregistrer'}
        </ButtonSecondary>
      </form>
    </Card>
  )
}
