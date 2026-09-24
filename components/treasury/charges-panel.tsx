import Link from 'next/link'

import { SectionLabel, StatCard } from '@/components/finance-shell'
import { MissingParamBanner } from '@/components/fiscal/missing-param-banner'
import type { statusPeriods as statusPeriodsTable } from '@/db/schema'
import { computeCompanyCharges, computeMicroCharges, computeThresholdGauge } from '@/lib/fiscal/compute-charges'
import type { FiscalParamsResult } from '@/lib/fiscal/get-params'
import type { FiscalParamKey } from '@/lib/fiscal/param-definitions'
import { formatEuros } from '@/lib/money'

type StatusPeriod = typeof statusPeriodsTable.$inferSelect

const statusLabels = { micro: 'Micro-entreprise', eurl: 'EURL', sasu: 'SASU' } as const
const vatRegimeLabels = { franchise: 'Franchise en base', reel_simplifie: 'Réel simplifié', reel_normal: 'Réel normal' } as const

export function ChargesPanel({
  statusPeriod,
  fiscalParams,
  realizedCaCents,
}: {
  statusPeriod: StatusPeriod | null
  fiscalParams: FiscalParamsResult | null
  realizedCaCents: number
}) {
  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="blue">Charges</SectionLabel>
          <h2 className="text-3xl">COTISATIONS & IMPÔTS ESTIMÉS</h2>
        </div>
        {statusPeriod && (
          <span className="font-mono text-xs uppercase text-[var(--ink)]/60">
            {statusLabels[statusPeriod.status]} · {vatRegimeLabels[statusPeriod.vatRegime]}
          </span>
        )}
      </div>

      {!statusPeriod ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">
          Aucun statut juridique renseigné pour aujourd&apos;hui.{' '}
          <Link href="/settings" className="underline underline-offset-4">
            Configurer dans les paramètres
          </Link>
          .
        </p>
      ) : fiscalParams?.status === 'missing_params' ? (
        <MissingParamBanner missing={fiscalParams.missing} year={fiscalParams.year} />
      ) : fiscalParams?.status === 'ok' ? (
        <ChargesEstimate status={statusPeriod.status} values={fiscalParams.values} realizedCaCents={realizedCaCents} />
      ) : null}
    </div>
  )
}

function ChargesEstimate({
  status,
  values,
  realizedCaCents,
}: {
  status: StatusPeriod['status']
  values: Record<FiscalParamKey, number>
  realizedCaCents: number
}) {
  if (status === 'micro') {
    const charges = computeMicroCharges({ caEncaisseCents: realizedCaCents, values })
    const caGauge = computeThresholdGauge(realizedCaCents, values.ca_threshold_cents)
    const vatGauge = computeThresholdGauge(realizedCaCents, values.vat_franchise_threshold_cents)
    return (
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Cotisations sociales" value={formatEuros(charges.cotisationsCents)} note="CA encaissé de l'année" tone="pink" />
          <StatCard label="Formation professionnelle" value={formatEuros(charges.formationProCents)} />
          <StatCard label="Net estimé" value={formatEuros(charges.netCents)} note="Hors IR classique du foyer" tone="blue" />
        </div>
        <ThresholdGauge label="Plafond de CA micro-entreprise" gauge={caGauge} />
        <ThresholdGauge label="Franchise en base de TVA" gauge={vatGauge} />
      </div>
    )
  }

  const charges = computeCompanyCharges({ taxableProfitCents: realizedCaCents, values })
  const vatGauge = computeThresholdGauge(realizedCaCents, values.vat_franchise_threshold_cents)
  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-[11px] text-[var(--ink)]/50">
        Estimation simplifiée : bénéfice imposable assimilé au CA encaissé (aucune charge déductible modélisée), 100 % du résultat net
        supposé versé en rémunération — ordre de grandeur, pas une liasse fiscale.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Impôt sur les sociétés" value={formatEuros(charges.isCents)} tone="pink" />
        <StatCard label="Cotisations dirigeant" value={formatEuros(charges.socialContributionsCents)} />
        <StatCard label="Net dirigeant estimé" value={formatEuros(charges.netDirigeantCents)} tone="blue" />
      </div>
      <ThresholdGauge label="Franchise en base de TVA" gauge={vatGauge} />
    </div>
  )
}

function ThresholdGauge({ label, gauge }: { label: string; gauge: { ratio: number; remainingCents: number } }) {
  const percent = Math.min(100, Math.round(gauge.ratio * 100))
  return (
    <div>
      <div className="flex justify-between font-mono text-xs">
        <span>{label}</span>
        <span>{percent} % consommé</span>
      </div>
      <div className="mt-2 h-5 border-2 border-[var(--ink)] p-0.5">
        <div className={percent >= 90 ? 'h-full bg-[var(--pink)]' : 'h-full bg-[var(--blue)]'} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 font-mono text-[11px] text-[var(--ink)]/60">
        {gauge.remainingCents > 0 ? `${formatEuros(gauge.remainingCents)} avant le seuil.` : 'Seuil dépassé.'}
      </p>
    </div>
  )
}
