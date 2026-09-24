import { DashboardMonthSelect } from '@/components/dashboard-month-select'
import { FinanceShell } from '@/components/finance-shell'
import { DashboardScreen } from '@/components/dashboard-screen'
import { requireSession } from '@/lib/auth/session'
import { currentMonthValue, recentMonthOptions } from '@/lib/dashboard/months'
import {
  getCashflowTrajectory,
  getCurrentMonthComparison,
  getMonthlyRealizedCa,
  getOverdueSummary,
  getTopDependencyClient,
} from '@/lib/dashboard/queries'
import { listDeadlines } from '@/lib/deadlines/queries'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await requireSession()
  const { month } = await searchParams
  const referenceMonth = month || currentMonthValue()

  const [monthComparison, monthlyRevenue, cashflowTrajectory, overdue, topDependency, deadlines] = await Promise.all([
    getCurrentMonthComparison(referenceMonth),
    getMonthlyRealizedCa(12, referenceMonth),
    getCashflowTrajectory(session.user.id),
    getOverdueSummary(session.user.id),
    getTopDependencyClient(),
    listDeadlines(),
  ])
  const upcomingDeadlines = deadlines.filter((d) => d.status === 'pending').slice(0, 3)

  const firstName = session.user.name?.split(' ')[0] ?? ''
  const today = dateFormatter.format(new Date())
  const monthLabel = recentMonthOptions(24).find((option) => option.value === referenceMonth)?.label ?? referenceMonth

  return (
    <FinanceShell title="VUE D’ENSEMBLE" eyebrow={`Bonjour ${firstName} · ${today}`} headerControl={<DashboardMonthSelect />}>
      <DashboardScreen
        monthLabel={monthLabel}
        monthComparison={monthComparison}
        monthlyRevenue={monthlyRevenue}
        cashflowTrajectory={cashflowTrajectory}
        overdue={overdue}
        topDependency={topDependency}
        upcomingDeadlines={upcomingDeadlines}
      />
    </FinanceShell>
  )
}
