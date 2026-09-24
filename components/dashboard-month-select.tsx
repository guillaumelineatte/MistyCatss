'use client'

import { useQueryState } from 'nuqs'
import { ChevronDown } from 'lucide-react'

import { currentMonthValue, recentMonthOptions } from '@/lib/dashboard/months'

/** Remplace l'ancien sélecteur de période (mort depuis la Phase 0) — propre au tableau de bord, pas un contrôle global. */
export function DashboardMonthSelect() {
  const [month, setMonth] = useQueryState('month', { defaultValue: currentMonthValue(), shallow: false })
  const options = recentMonthOptions(12)

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="dashboard-month">
        Mois affiché
      </label>
      <select
        id="dashboard-month"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        className="h-11 appearance-none border-2 border-[var(--ink)] bg-[var(--paper)] px-3 pr-9 font-mono text-xs uppercase shadow-[4px_4px_0_var(--ink)] outline-none focus:border-[var(--blue)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-3 size-4" />
    </div>
  )
}
