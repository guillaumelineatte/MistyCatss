'use client'

import { useTheme } from './finance-shell'
import { updateThemeAction } from '@/lib/settings/actions'

const themes = [
  { id: 'sauge', name: 'Sauge & papier', paper: '#F4EBDD', ink: '#171713', accent: '#3D5B45', secondary: '#E85D2A' },
  { id: 'terracotta', name: 'Terracotta & craie', paper: '#F3E5D0', ink: '#211915', accent: '#B94E35', secondary: '#D5A33A' },
  { id: 'nuit', name: 'Nuit & citron', paper: '#F1F0D5', ink: '#161616', accent: '#24372D', secondary: '#D6E84A' },
  { id: 'prune', name: 'Prune & sable', paper: '#F2E8DE', ink: '#21171D', accent: '#64344B', secondary: '#D57945' },
  { id: 'lavande', name: 'Lavande & lilas', paper: '#EEEAF7', ink: '#211E2B', accent: '#7057A6', secondary: '#E47DAD' },
  { id: 'menthe', name: 'Menthe & miel', paper: '#E4F2E7', ink: '#17241E', accent: '#2D7D63', secondary: '#E5B83C' },
  { id: 'cobalt', name: 'Cobalt & ivoire', paper: '#F0F2EA', ink: '#121A2A', accent: '#2456C4', secondary: '#F0B429' },
  { id: 'corail', name: 'Corail & lilas', paper: '#FFF0EB', ink: '#2A171A', accent: '#E85D52', secondary: '#9B72C2' },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <section className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--ink)]/60">Personnalisation</p>
          <h2 className="mt-3 text-5xl">TON ENCRE</h2>
        </div>
        <p className="max-w-xs font-mono text-xs leading-relaxed text-[var(--ink)]/65">Choisis une combinaison de couleurs pour toute l&apos;interface. Le style reste brut, les encres changent.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {themes.map((item) => {
          const active = theme === item.id
          return (
            <button key={item.id} type="button" onClick={() => { setTheme(item.id); void updateThemeAction(item.id) }} aria-pressed={active} className={`group relative min-h-36 border-2 border-[var(--ink)] p-4 text-left shadow-[4px_4px_0_var(--ink)] transition-transform hover:-translate-y-1 ${active ? 'rotate-1' : ''}`} style={{ backgroundColor: item.paper, color: item.ink }}>
              <div className="flex gap-2">
                <span className="size-8 border-2 border-current" style={{ backgroundColor: item.ink }} />
                <span className="size-8 border-2 border-current" style={{ backgroundColor: item.accent }} />
                <span className="size-8 border-2 border-current" style={{ backgroundColor: item.secondary }} />
              </div>
              <p className="mt-7 font-anton text-2xl uppercase leading-none">{item.name}</p>
              {active && <span className="absolute -right-2 -top-3 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-1 font-mono text-[10px] uppercase text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">Actif</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
