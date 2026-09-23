'use client'

import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, CalendarClock, ChevronRight, CircleAlert, Plus } from 'lucide-react'
import { monthlyRevenue, taxDeadlines, invoices } from '@/lib/mock-data'
import { ButtonPrimary, SectionLabel, StatCard } from './finance-shell'

const cashflow = [
  { month: 'SEP', value: 11800 },
  { month: 'OCT', value: 13200 },
  { month: 'NOV', value: 15400 },
]

const eur = (value: number) => `${value.toLocaleString('fr-FR')} €`

export function DashboardScreen() {
  const [showAll, setShowAll] = useState(false)
  return <div className="flex flex-col gap-8">
    <section className="relative overflow-hidden border-[3px] border-[var(--ink)] bg-[var(--pink)] p-6 shadow-[8px_8px_0_var(--ink)] md:p-8">
      <div className="pointer-events-none absolute -right-8 -top-12 size-56 border-[28px] border-[var(--blue)] mix-blend-multiply md:size-72" />
      <div className="relative max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center gap-3"><SectionLabel tone="ink">Août 2025</SectionLabel><span className="rotate-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-2 font-mono text-xs text-[var(--paper)] shadow-[4px_4px_0_var(--ink)]">+18,4 % VS MOIS DERNIER</span></div>
        <p className="font-mono text-xs uppercase tracking-[.16em] text-[var(--paper)]/70">CA encaissé ce mois</p>
        <p className="mt-3 font-anton text-[clamp(5rem,13vw,9rem)] leading-[.72] tracking-[-.05em] text-[var(--paper)]">4 400 €</p>
        <p className="mt-8 max-w-lg font-mono text-sm leading-relaxed text-[var(--paper)]">Le mois est calme. Le pipeline, lui, ne l&apos;est pas. 3 factures en retard tirent 4 200 € vers le bas.</p>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)] md:p-6">
        <div className="mb-6 flex items-start justify-between"><div><SectionLabel tone="blue">Trajectoire</SectionLabel><h2 className="mt-4 text-4xl">CA SUR 12 MOIS</h2></div><span className="font-mono text-[10px] uppercase text-[var(--ink)]/60">En euros · HT</span></div>
        <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyRevenue} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--ink)" strokeOpacity={0.16} vertical={false} /><XAxis dataKey="month" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--ink)' }} axisLine={{ stroke: 'var(--ink)' }} tickLine={false} /><YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--ink)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} /><Tooltip contentStyle={{ border: '2px solid var(--ink)', borderRadius: 0, background: 'var(--paper)', fontFamily: 'JetBrains Mono', fontSize: 12 }} /><Line type="linear" dataKey="target" stroke="var(--ink)" strokeDasharray="4 5" strokeWidth={1.5} dot={false} /><Line type="linear" dataKey="revenue" stroke="var(--blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--pink)', stroke: 'var(--ink)', strokeWidth: 2 }} connectNulls /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="border-2 border-[var(--ink)] bg-[var(--blue)] p-5 text-[var(--paper)] shadow-[6px_6px_0_var(--ink)] md:p-6"><div className="flex items-center justify-between"><SectionLabel>Projection</SectionLabel><ArrowUpRight aria-hidden="true" /></div><h2 className="mt-5 text-4xl">TRÉSORERIE<br />À 3 MOIS</h2><div className="my-6 h-44 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashflow}><defs><pattern id="cashPattern" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="var(--pink)" strokeWidth="2" /></pattern></defs><CartesianGrid stroke="var(--paper)" strokeOpacity={0.2} vertical={false} /><XAxis dataKey="month" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--paper)' }} axisLine={{ stroke: 'var(--paper)' }} tickLine={false} /><YAxis hide /><Area type="linear" dataKey="value" stroke="var(--paper)" strokeWidth={2} fill="url(#cashPattern)" /></AreaChart></ResponsiveContainer></div><p className="font-anton text-4xl">15 400 €</p><p className="mt-1 font-mono text-xs text-[var(--paper)]/70">Fin novembre · +31 %</p></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1fr_1fr_1.25fr]">
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]"><div className="mb-5 flex items-center justify-between"><h2 className="text-3xl">ÉCHÉANCES</h2><CalendarClock className="size-5" /></div><div className="flex flex-col gap-3">{taxDeadlines.slice(0, 3).map((item, index) => <div key={item.id} className="flex items-center justify-between border-t border-[var(--ink)] pt-3"><div><p className="font-bold">{item.label}</p><p className="font-mono text-[10px] text-[var(--ink)]/60">{item.date.split('-').reverse().join('/')}</p></div><span className={index === 0 ? 'font-mono text-sm text-[var(--pink)]' : 'font-mono text-sm'}>{eur(item.amount)}</span></div>)}</div><button className="mt-5 flex items-center gap-1 font-mono text-xs uppercase underline underline-offset-4">Voir le calendrier <ChevronRight className="size-3" /></button></div>
      <div className="border-2 border-[var(--ink)] bg-[var(--pink)] p-5 text-[var(--paper)] shadow-[6px_6px_0_var(--ink)]"><div className="mb-5 flex items-center justify-between"><h2 className="text-3xl">EN RETARD</h2><CircleAlert className="size-5" /></div><p className="font-anton text-7xl leading-none">3</p><p className="mt-2 font-mono text-sm">factures · 4 200 € dehors</p><div className="mt-6 border-t-2 border-[var(--ink)] pt-4"><div className="flex justify-between font-mono text-xs"><span>Plus vieille</span><span>F023 · 48 jours</span></div></div><button className="mt-6 flex items-center gap-1 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-anton text-sm uppercase text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">Relancer maintenant <ArrowUpRight className="size-4" /></button></div>
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-3xl">DÉPENDANCE</h2><p className="mt-2 font-mono text-xs text-[var(--ink)]/60">Concentration du CA</p></div><span className="rotate-2 bg-[var(--pink)] px-2 py-1 font-mono text-[10px] text-[var(--paper)]">ATTENTION</span></div><p className="font-anton text-7xl leading-none">40<span className="text-4xl">%</span></p><p className="mt-2 font-mono text-sm">Agence Digitale Nord</p><div className="mt-5 h-4 border-2 border-[var(--ink)] bg-[var(--paper)]"><div className="h-full w-[40%] bg-[var(--pink)]" /></div><p className="mt-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]/70">Un seul client pèse presque la moitié de ton année. Diversifie le risque.</p></div>
    </section>

    <section className="flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[.14em] text-[var(--ink)]/60">Action rapide</p><h2 className="mt-2 text-4xl">ON N&apos;ATTEND PAS</h2></div><div className="flex flex-wrap gap-3"><ButtonPrimary><Plus className="size-4" /> Nouvelle facture</ButtonPrimary><button className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[6px_6px_0_var(--ink)]"><ArrowUpRight className="size-4" /> Relancer 3 factures</button></div></section>
  </div>
}

export function DashboardStatStrip() {
  return <div className="grid gap-4 sm:grid-cols-3"><StatCard label="CA annuel" value="78 240 €" note="+12,8 % vs 2024" tone="blue" /><StatCard label="En attente" value="11 880 €" note="6 devis ouverts" tone="paper" /><StatCard label="TJM effectif" value="527 €" note="Cible · 550 €" tone="pink" /></div>
}

export function EmptyInvoicePreview() {
  const [selected, setSelected] = useState(false)
  return <div className="flex min-h-64 flex-col items-center justify-center border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-6 text-center"><p className="font-anton text-4xl">AUCUN APERÇU</p><p className="mt-2 max-w-xs font-mono text-xs text-[var(--ink)]/60">Sélectionne une facture pour afficher le document ici.</p><button onClick={() => setSelected(!selected)} className="mt-5 border-2 border-[var(--ink)] bg-[var(--pink)] px-3 py-2 font-anton text-sm text-[var(--paper)]">{selected ? 'APERÇU OUVERT' : 'CHOISIR UNE FACTURE'}</button></div>
}

export { invoices }
