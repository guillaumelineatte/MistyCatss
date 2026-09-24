'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, CalendarClock, ChevronRight, CircleAlert, Plus } from 'lucide-react'

import type { deadlines as deadlinesTable } from '@/db/schema'
import type { getCashflowTrajectory, getCurrentMonthComparison, getMonthlyRealizedCa, getOverdueSummary, getTopDependencyClient } from '@/lib/dashboard/queries'
import { sendReminderAction } from '@/lib/invoicing/actions'
import { formatEuros } from '@/lib/money'
import { ButtonPrimary, SectionLabel } from './finance-shell'

const eur = (cents: number) => formatEuros(cents)

const deadlineKindLabels: Record<string, string> = { urssaf: 'URSSAF', tva: 'TVA', is: 'IS', cfe: 'CFE' }

function formatPercent(basisPoints: number): string {
  const sign = basisPoints >= 0 ? '+' : ''
  return `${sign}${(basisPoints / 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}

export function DashboardScreen({
  monthLabel,
  monthComparison,
  monthlyRevenue,
  cashflowTrajectory,
  overdue,
  topDependency,
  upcomingDeadlines,
}: {
  monthLabel: string
  monthComparison: Awaited<ReturnType<typeof getCurrentMonthComparison>>
  monthlyRevenue: Awaited<ReturnType<typeof getMonthlyRealizedCa>>
  cashflowTrajectory: Awaited<ReturnType<typeof getCashflowTrajectory>>
  overdue: Awaited<ReturnType<typeof getOverdueSummary>>
  topDependency: Awaited<ReturnType<typeof getTopDependencyClient>>
  upcomingDeadlines: (typeof deadlinesTable.$inferSelect)[]
}) {
  const router = useRouter()
  const [reminding, setReminding] = useState(false)

  async function onRemindAll() {
    setReminding(true)
    for (const id of overdue.invoiceIds) await sendReminderAction(id)
    setReminding(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden border-[3px] border-[var(--ink)] bg-[var(--pink)] p-6 shadow-[8px_8px_0_var(--ink)] md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-56 border-[28px] border-[var(--blue)] mix-blend-multiply md:size-72" />
        <div className="relative max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <SectionLabel tone="ink">{monthLabel}</SectionLabel>
            {monthComparison.changeBasisPoints != null && (
              <span className="rotate-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-2 font-mono text-xs text-[var(--paper)] shadow-[4px_4px_0_var(--ink)]">
                {formatPercent(monthComparison.changeBasisPoints)} VS MOIS PRÉCÉDENT
              </span>
            )}
          </div>
          <p className="font-mono text-xs uppercase tracking-[.16em] text-[var(--paper)]/70">CA encaissé</p>
          <p className="mt-3 font-anton text-[clamp(5rem,13vw,9rem)] leading-[.72] tracking-[-.05em] text-[var(--paper)]">
            {eur(monthComparison.currentCents)}
          </p>
          <p className="mt-8 max-w-lg font-mono text-sm leading-relaxed text-[var(--paper)]">
            {overdue.count > 0
              ? `Le pipeline, lui, ne l'est pas. ${overdue.count} facture${overdue.count > 1 ? 's' : ''} en retard tire${overdue.count > 1 ? 'nt' : ''} ${eur(overdue.totalOutstandingCents)} vers le bas.`
              : 'Aucune facture en retard pour l\'instant.'}
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)] md:p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <SectionLabel tone="blue">Trajectoire</SectionLabel>
              <h2 className="mt-4 text-4xl">CA SUR 12 MOIS</h2>
            </div>
            <span className="font-mono text-[10px] uppercase text-[var(--ink)]/60">En euros · encaissé</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="var(--ink)" strokeOpacity={0.16} vertical={false} />
                <XAxis dataKey="month" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--ink)' }} axisLine={{ stroke: 'var(--ink)' }} tickLine={false} />
                <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--ink)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ border: '2px solid var(--ink)', borderRadius: 0, background: 'var(--paper)', fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                <Line type="linear" dataKey="revenue" stroke="var(--blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--pink)', stroke: 'var(--ink)', strokeWidth: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="border-2 border-[var(--ink)] bg-[var(--blue)] p-5 text-[var(--paper)] shadow-[6px_6px_0_var(--ink)] md:p-6">
          <div className="flex items-center justify-between">
            <SectionLabel>Projection</SectionLabel>
            <ArrowUpRight aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-4xl">
            TRÉSORERIE
            <br />
            À 3 MOIS
          </h2>
          <div className="my-6 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowTrajectory}>
                <defs>
                  <pattern id="cashPattern" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="var(--pink)" strokeWidth="2" />
                  </pattern>
                </defs>
                <CartesianGrid stroke="var(--paper)" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="month" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--paper)' }} axisLine={{ stroke: 'var(--paper)' }} tickLine={false} />
                <YAxis hide />
                <Area type="linear" dataKey="value" stroke="var(--paper)" strokeWidth={2} fill="url(#cashPattern)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="font-anton text-4xl">{eur(cashflowTrajectory[2]?.value != null ? cashflowTrajectory[2].value * 100 : 0)}</p>
          <p className="mt-1 font-mono text-xs text-[var(--paper)]/70">Solde projeté fin {cashflowTrajectory[2]?.month ?? ''}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1.25fr]">
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl">ÉCHÉANCES</h2>
            <CalendarClock className="size-5" />
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="font-mono text-xs text-[var(--ink)]/60">Aucune échéance à venir.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={deadline.id} className="flex items-center justify-between border-t border-[var(--ink)] pt-3">
                  <div>
                    <p className="font-bold">{deadlineKindLabels[deadline.kind] ?? deadline.kind}</p>
                    <p className="font-mono text-[10px] text-[var(--ink)]/60">{deadline.dueDate.split('-').reverse().join('/')}</p>
                  </div>
                  <span className={index === 0 ? 'font-mono text-sm text-[var(--pink)]' : 'font-mono text-sm'}>
                    {deadline.amountEstimateCents != null ? eur(deadline.amountEstimateCents) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href="/treasury" className="mt-5 flex items-center gap-1 font-mono text-xs uppercase underline underline-offset-4">
            Voir le calendrier <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="border-2 border-[var(--ink)] bg-[var(--pink)] p-5 text-[var(--paper)] shadow-[6px_6px_0_var(--ink)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl">EN RETARD</h2>
            <CircleAlert className="size-5" />
          </div>
          <p className="font-anton text-7xl leading-none">{overdue.count}</p>
          <p className="mt-2 font-mono text-sm">
            facture{overdue.count > 1 ? 's' : ''} · {eur(overdue.totalOutstandingCents)} dehors
          </p>
          {overdue.oldest && (
            <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
              <div className="flex justify-between font-mono text-xs">
                <span>Plus vieille</span>
                <span>
                  {overdue.oldest.fullNumber ?? '—'} · {overdue.oldestDaysLate} jours
                </span>
              </div>
            </div>
          )}
          {overdue.count > 0 && (
            <button
              onClick={onRemindAll}
              disabled={reminding}
              className="mt-6 flex items-center gap-1 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-anton text-sm uppercase text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] disabled:opacity-50"
            >
              {reminding ? 'Envoi…' : 'Relancer maintenant'} <ArrowUpRight className="size-4" />
            </button>
          )}
        </div>
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-3xl">DÉPENDANCE</h2>
              <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">Concentration du CA</p>
            </div>
            {topDependency && topDependency.shareBasisPoints >= 3000 && (
              <span className="rotate-2 bg-[var(--pink)] px-2 py-1 font-mono text-[10px] text-[var(--paper)]">ATTENTION</span>
            )}
          </div>
          {topDependency ? (
            <>
              <p className="font-anton text-7xl leading-none">
                {Math.round(topDependency.shareBasisPoints / 100)}
                <span className="text-4xl">%</span>
              </p>
              <p className="mt-2 font-mono text-sm">{topDependency.clientName}</p>
              <div className="mt-5 h-4 border-2 border-[var(--ink)] bg-[var(--paper)]">
                <div className="h-full bg-[var(--pink)]" style={{ width: `${Math.min(100, Math.round(topDependency.shareBasisPoints / 100))}%` }} />
              </div>
              {topDependency.shareBasisPoints >= 3000 && (
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]/70">
                  Un seul client pèse une grande part de ton CA. Diversifie le risque.
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-xs text-[var(--ink)]/60">Pas encore assez de factures émises pour calculer ça.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.14em] text-[var(--ink)]/60">Action rapide</p>
          <h2 className="mt-2 text-4xl">ON N&apos;ATTEND PAS</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/invoices/new">
            <ButtonPrimary>
              <Plus className="size-4" /> Nouvelle facture
            </ButtonPrimary>
          </Link>
          {overdue.count > 0 && (
            <button
              onClick={onRemindAll}
              disabled={reminding}
              className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[6px_6px_0_var(--ink)] disabled:opacity-50"
            >
              <ArrowUpRight className="size-4" /> {reminding ? 'Envoi…' : `Relancer ${overdue.count} facture${overdue.count > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
