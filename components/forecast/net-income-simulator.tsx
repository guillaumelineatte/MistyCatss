'use client'

import { useState } from 'react'

import { SectionLabel } from '@/components/finance-shell'
import { MissingParamBanner } from '@/components/fiscal/missing-param-banner'
import type { StatutJuridique } from '@/db/schema'
import { computeCompanyCharges, computeMicroCharges } from '@/lib/fiscal/compute-charges'
import type { FiscalParamsResult } from '@/lib/fiscal/get-params'
import type { FiscalParamKey } from '@/lib/fiscal/param-definitions'
import { formatEuros } from '@/lib/money'

const STATUSES: StatutJuridique[] = ['micro', 'eurl', 'sasu']
const statusLabels: Record<StatutJuridique, string> = { micro: 'Micro-entreprise', eurl: 'EURL', sasu: 'SASU' }

export function NetIncomeSimulator({ fiscalParamsByStatus }: { fiscalParamsByStatus: Record<StatutJuridique, FiscalParamsResult> }) {
  const [caCents, setCaCents] = useState(6_000_000) // 60 000 € par défaut, ajustable

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex justify-between">
        <div className="flex items-center gap-3">
          <SectionLabel tone="blue">Simulation</SectionLabel>
          <h2 className="text-3xl">REVENU NET PAR STATUT</h2>
        </div>
      </div>
      <div className="mt-7 flex items-center justify-between">
        <span className="font-mono text-xs uppercase">CA annuel simulé</span>
        <span className="font-anton text-4xl">{formatEuros(caCents)}</span>
      </div>
      <input
        aria-label="CA annuel simulé"
        type="range"
        min={0}
        max={20_000_000}
        step={100_00}
        value={caCents}
        onChange={(event) => setCaCents(Number(event.target.value))}
        className="mt-5 w-full accent-[var(--pink)]"
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <StatusColumn key={status} status={status} caCents={caCents} result={fiscalParamsByStatus[status]} />
        ))}
      </div>
    </div>
  )
}

function StatusColumn({ status, caCents, result }: { status: StatutJuridique; caCents: number; result: FiscalParamsResult }) {
  return (
    <div className="border-2 border-[var(--ink)] p-4">
      <p className="font-anton text-2xl">{statusLabels[status]}</p>
      {result.status === 'missing_params' ? (
        <div className="mt-4">
          <MissingParamBanner missing={result.missing} year={result.year} />
        </div>
      ) : (
        <NetResult status={status} caCents={caCents} values={result.values} />
      )}
    </div>
  )
}

function NetResult({ status, caCents, values }: { status: StatutJuridique; caCents: number; values: Record<FiscalParamKey, number> }) {
  const netCents =
    status === 'micro' ? computeMicroCharges({ caEncaisseCents: caCents, values }).netCents : computeCompanyCharges({ taxableProfitCents: caCents, values }).netDirigeantCents

  return (
    <div className="mt-4 border-t-2 border-[var(--ink)] pt-4">
      <p className="font-mono text-xs uppercase text-[var(--ink)]/60">Net estimé</p>
      <p className="mt-2 font-anton text-5xl">{formatEuros(netCents)}</p>
      <p className="mt-2 font-mono text-[11px] text-[var(--ink)]/60">
        {caCents > 0 ? `${Math.round((netCents / caCents) * 100)} % du CA` : ''}
      </p>
    </div>
  )
}
