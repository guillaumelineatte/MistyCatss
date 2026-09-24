import { SectionLabel, StatCard } from '@/components/finance-shell'
import type { CashflowProjectionResult } from '@/lib/fiscal/forecast'
import { formatEuros } from '@/lib/money'

export function CashflowCard({ cashflow3m, cashflow6m }: { cashflow3m: CashflowProjectionResult; cashflow6m: CashflowProjectionResult }) {
  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex items-center gap-3">
        <SectionLabel tone="blue">Projection</SectionLabel>
        <h2 className="text-3xl">TRÉSORERIE PROJETÉE</h2>
      </div>
      <p className="font-mono text-[11px] text-[var(--ink)]/50">
        Solde actuel + encours de factures dont l&apos;échéance tombe dans la fenêtre - échéances de charges estimées dans la même
        fenêtre. Une facture sans échéance ou une charge sans montant estimé n&apos;est pas prise en compte.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase text-[var(--ink)]/60">À 3 mois ({cashflow3m.horizonDate.split('-').reverse().join('/')})</p>
          <StatCard label="Solde projeté" value={formatEuros(cashflow3m.projectedBalanceCents)} tone="blue" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Encours attendu" value={formatEuros(cashflow3m.expectedInCents)} />
            <StatCard label="Charges attendues" value={formatEuros(cashflow3m.expectedOutCents)} tone="pink" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase text-[var(--ink)]/60">À 6 mois ({cashflow6m.horizonDate.split('-').reverse().join('/')})</p>
          <StatCard label="Solde projeté" value={formatEuros(cashflow6m.projectedBalanceCents)} tone="blue" />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Encours attendu" value={formatEuros(cashflow6m.expectedInCents)} />
            <StatCard label="Charges attendues" value={formatEuros(cashflow6m.expectedOutCents)} tone="pink" />
          </div>
        </div>
      </div>
    </div>
  )
}
