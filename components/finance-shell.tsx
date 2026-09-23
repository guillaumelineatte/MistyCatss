'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronDown,
  Clock3,
  Command,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeId = 'sauge' | 'terracotta' | 'nuit' | 'prune' | 'lavande' | 'menthe' | 'cobalt' | 'corail'
const ThemeContext = createContext<{ theme: ThemeId; setTheme: (theme: ThemeId) => void }>({ theme: 'sauge', setTheme: () => undefined })
export const useTheme = () => useContext(ThemeContext)

const themeTokens: Record<ThemeId, Record<string, string>> = {
  sauge: { paper: '#F4EBDD', ink: '#171713', accent: '#3D5B45', secondary: '#E85D2A', pink: '#E85D2A', blue: '#3D5B45', over: '#B88A32' },
  terracotta: { paper: '#F3E5D0', ink: '#211915', accent: '#B94E35', secondary: '#D5A33A', pink: '#D5A33A', blue: '#B94E35', over: '#6E3E2E' },
  nuit: { paper: '#F1F0D5', ink: '#161616', accent: '#24372D', secondary: '#D6E84A', pink: '#D6E84A', blue: '#24372D', over: '#9CAF3B' },
  prune: { paper: '#F2E8DE', ink: '#21171D', accent: '#64344B', secondary: '#D57945', pink: '#D57945', blue: '#64344B', over: '#A95765' },
  lavande: { paper: '#EEEAF7', ink: '#211E2B', accent: '#7057A6', secondary: '#E47DAD', pink: '#E47DAD', blue: '#7057A6', over: '#A991D4' },
  menthe: { paper: '#E4F2E7', ink: '#17241E', accent: '#2D7D63', secondary: '#E5B83C', pink: '#E5B83C', blue: '#2D7D63', over: '#82BFA6' },
  cobalt: { paper: '#F0F2EA', ink: '#121A2A', accent: '#2456C4', secondary: '#F0B429', pink: '#F0B429', blue: '#2456C4', over: '#7395E0' },
  corail: { paper: '#FFF0EB', ink: '#2A171A', accent: '#E85D52', secondary: '#9B72C2', pink: '#9B72C2', blue: '#E85D52', over: '#F29A72' },
}

const nav = [
  { href: '/', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { href: '/invoices', label: 'Devis & factures', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/treasury', label: 'Trésorerie & charges', icon: WalletCards },
  { href: '/time', label: 'Temps & rentabilité', icon: Clock3 },
  { href: '/forecast', label: 'Prévisionnel', icon: BarChart3 },
]

export function FinanceShell({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow?: string }) {
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [period, setPeriod] = useState('AOUT 2025')
  const [theme, setTheme] = useState<ThemeId>('sauge')

  useEffect(() => {
    const root = document.documentElement
    const tokens = themeTokens[theme]
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(`--${key}`, value))
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <button
        aria-label="Ouvrir le menu"
        className="fixed left-4 top-4 z-40 flex size-11 items-center justify-center border-2 border-[var(--ink)] bg-[var(--pink)] shadow-[4px_4px_0_var(--ink)] md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu aria-hidden="true" />
      </button>
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[var(--ink)] px-5 py-6 text-[var(--paper)] transition-transform duration-150 md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="mb-10 flex items-start justify-between">
          <Link href="/" className="block" onClick={() => setMobileOpen(false)}>
            <span className="font-anton text-5xl uppercase leading-[.75] tracking-[-.04em]">ARGENT<br /><span className="text-[var(--pink)]">BRUT</span></span>
            <span className="mt-3 block font-mono text-[10px] uppercase tracking-[.18em] text-[var(--paper)]/60">Finance · 2025</span>
          </Link>
          <button className="md:hidden" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)}><X /></button>
        </div>

        <div className="mb-8 border-y border-[var(--paper)]/25 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[var(--paper)]/50">Statut actuel</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold uppercase">Micro-entreprise</span>
            <span className="bg-[var(--blue)] px-2 py-1 font-mono text-[10px] uppercase">Actif</span>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group flex items-center gap-3 border-2 border-transparent px-3 py-3 font-anton text-lg uppercase tracking-[-.02em] transition-[transform,background-color] duration-100',
                  active ? 'translate-x-1 -rotate-1 border-[var(--ink)] bg-[var(--pink)] text-[var(--paper)] shadow-[4px_4px_0_var(--paper)]' : 'text-[var(--paper)]/75 hover:bg-[var(--paper)]/10 hover:text-[var(--paper)]',
                )}
              >
                <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />
                {item.label}
              </Link>
            )
          })}
          <Link href="/settings" className={cn('group mt-auto flex items-center gap-3 border-2 border-transparent px-3 py-3 font-[Anton] text-lg uppercase tracking-[-.02em] text-[var(--paper)]/75 hover:bg-[var(--paper)]/10 hover:text-[var(--paper)]', pathname.startsWith('/settings') && 'border-[var(--ink)] bg-[var(--blue)] text-[var(--paper)]')}>
            <Settings aria-hidden="true" className="size-4" strokeWidth={2.5} />
            Paramètres
          </Link>
        </nav>

        <div className="mt-8 border-t border-[var(--paper)]/25 pt-4 font-mono text-[10px] uppercase leading-relaxed text-[var(--paper)]/50">
          <p>Dernière sync</p>
          <p className="text-[var(--paper)]">Aujourd’hui · 09:42</p>
          <p className="mt-4">v0.1 · Brutalement simple</p>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-20 bg-[var(--ink)]/40 md:hidden" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />}

      <main className="min-h-screen md:pl-64">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--ink)] px-5 pb-4 pt-6 md:px-10 md:pb-5 md:pt-7">
          <div className="pl-14 md:pl-0">
            {eyebrow && <p className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-[var(--ink)]/60">{eyebrow}</p>}
            <h1 className="max-w-[700px] text-5xl md:text-7xl">{title}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <label className="sr-only" htmlFor="period">Période</label>
            <div className="relative">
              <select id="period" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 appearance-none border-2 border-[var(--ink)] bg-[var(--paper)] px-3 pr-9 font-mono text-xs uppercase shadow-[4px_4px_0_var(--ink)] outline-none focus:border-[var(--blue)]">
                <option>AOÛT 2025</option>
                <option>JUILLET 2025</option>
                <option>EXERCICE 2025</option>
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-3 size-4" />
            </div>
            <button className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-3 font-anton text-sm uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-[transform,box-shadow] hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0_var(--ink)]" onClick={() => setPaletteOpen(true)}>
              <Command aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">CMD K</span>
            </button>
          </div>
        </header>
        <div className="p-5 md:p-10">{children}</div>
      </main>

      {paletteOpen && <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--ink)]/40 p-4 pt-[15vh]" role="dialog" aria-modal="true" aria-label="Palette de commandes">
        <div className="w-full max-w-xl border-[3px] border-[var(--ink)] bg-[var(--paper)] shadow-[10px_10px_0_var(--ink)]">
          <div className="flex items-center gap-3 border-b-2 border-[var(--ink)] px-4 py-3"><Search aria-hidden="true" className="size-5" /><input autoFocus className="w-full bg-transparent font-mono text-sm outline-none" placeholder="Rechercher une action…" /><button aria-label="Fermer" onClick={() => setPaletteOpen(false)}><X /></button></div>
          <div className="p-2 font-mono text-sm">
            {['Créer une facture', 'Ajouter un client', 'Démarrer le chrono', 'Exporter les données'].map((action, index) => <button key={action} className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-[var(--pink)]" onClick={() => setPaletteOpen(false)}><span>{action}</span><span className="text-[10px] text-[var(--ink)]/50">{index < 3 ? `⌘ ${index + 1}` : '↵'}</span></button>)}
          </div>
        </div>
      </div>}
      </div>
    </ThemeContext.Provider>
  )
}

export function SectionLabel({ children, tone = 'ink' }: { children: React.ReactNode; tone?: 'ink' | 'pink' | 'blue' }) {
  return <div className={cn('inline-block border-2 border-[var(--ink)] px-2 py-1 font-mono text-[10px] uppercase tracking-[.14em] shadow-[3px_3px_0_var(--ink)]', tone === 'pink' ? 'bg-[var(--pink)] text-[var(--paper)]' : tone === 'blue' ? 'bg-[var(--blue)] text-[var(--paper)]' : 'bg-[var(--paper)]')}>{children}</div>
}

export function ButtonPrimary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="flex h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--pink)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[6px_6px_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_var(--ink)]">{children}</button>
}

export function ButtonSecondary({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="flex h-11 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-4 font-anton text-sm uppercase shadow-[6px_6px_0_var(--ink)] transition-[transform,box-shadow] duration-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_var(--ink)]">{children}</button>
}

export function StatCard({ label, value, note, tone = 'paper', className }: { label: string; value: string; note?: string; tone?: 'paper' | 'pink' | 'blue'; className?: string }) {
  return <div className={cn('border-2 border-[var(--ink)] p-4 shadow-[6px_6px_0_var(--ink)]', tone === 'pink' ? 'bg-[var(--pink)] text-[var(--paper)]' : tone === 'blue' ? 'bg-[var(--blue)] text-[var(--paper)]' : 'bg-[var(--paper)]', className)}><p className="font-mono text-[10px] uppercase tracking-[.14em] opacity-70">{label}</p><p className="mt-3 font-anton text-5xl leading-none tracking-[-.03em]">{value}</p>{note && <p className="mt-3 font-mono text-[11px] opacity-75">{note}</p>}</div>
}

export function EmptyPoster({ title, text, action }: { title: string; text: string; action: string }) {
  return <div className="relative overflow-hidden border-[3px] border-[var(--ink)] bg-[var(--pink)] p-8 text-[var(--paper)] shadow-[8px_8px_0_var(--ink)]"><div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full border-[18px] border-[var(--blue)] mix-blend-multiply" /><div className="relative"><p className="font-anton text-6xl leading-[.8]">{title}</p><p className="mt-6 max-w-sm font-mono text-sm">{text}</p><button className="mt-6 border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-anton text-sm uppercase text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">{action}</button></div></div>
}

export { ArrowDownToLine, ArrowUpRight, CalendarClock, Plus }
