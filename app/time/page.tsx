import { FinanceShell } from '@/components/finance-shell'
import { TimeScreen } from '@/components/time/time-screen'
import { requireSession } from '@/lib/auth/session'
import { listClients } from '@/lib/clients/queries'
import { getClientsProfitabilityRanking, getProjectsProfitability, listAllProjects, listTimeEntriesForWeek } from '@/lib/time/queries'
import { addDays, getMonday, todayIso } from '@/lib/time/week'

export default async function TimePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireSession()
  const { week } = await searchParams
  const weekStart = getMonday(week || todayIso())
  const weekEnd = addDays(weekStart, 6)

  const [projects, clients, entries, profitability, clientRanking] = await Promise.all([
    listAllProjects(),
    listClients(),
    listTimeEntriesForWeek(weekStart, weekEnd),
    getProjectsProfitability(),
    getClientsProfitabilityRanking(),
  ])

  return (
    <FinanceShell title="TEMPS & RENTABILITÉ" eyebrow={`Semaine du ${weekStart.split('-').reverse().join('/')}`}>
      <TimeScreen projects={projects} clients={clients} entries={entries} weekStart={weekStart} profitability={profitability} clientRanking={clientRanking} />
    </FinanceShell>
  )
}
