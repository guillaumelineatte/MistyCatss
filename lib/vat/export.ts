import type { vatPeriods } from '@/db/schema'
import { formatEuros } from '@/lib/money'

type VatPeriod = typeof vatPeriods.$inferSelect

/** Export CSV simple des déclarations de TVA préparées : une ligne par période. */
export function buildVatPeriodsCsv(periods: VatPeriod[]): string {
  const header = ['Début', 'Fin', 'TVA collectée', 'TVA déductible', 'Solde', 'Statut']
  const rows = periods.map((period) => [
    period.periodStart,
    period.periodEnd,
    formatEuros(period.collectedCents),
    formatEuros(period.deductibleCents),
    formatEuros(period.collectedCents - period.deductibleCents),
    period.status,
  ])
  return [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}
