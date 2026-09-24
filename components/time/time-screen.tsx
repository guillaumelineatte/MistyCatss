import type { clients as clientsTable, projects as projectsTable, timeEntries as timeEntriesTable } from '@/db/schema'
import type { ClientProfitability, ProjectProfitability } from '@/lib/time/queries'
import { ConvertDialog } from './convert-dialog'
import { ProfitabilityPanel } from './profitability-panel'
import { ProjectPanel } from './project-panel'
import { WeekGrid } from './week-grid'

type Client = typeof clientsTable.$inferSelect
type Project = typeof projectsTable.$inferSelect & { client: Client }
type TimeEntry = typeof timeEntriesTable.$inferSelect & { project: Project }

export function TimeScreen({
  projects,
  clients,
  entries,
  weekStart,
  profitability,
  clientRanking,
}: {
  projects: Project[]
  clients: Client[]
  entries: TimeEntry[]
  weekStart: string
  profitability: ProjectProfitability[]
  clientRanking: ClientProfitability[]
}) {
  const activeProjects = projects.filter((p) => p.active)

  return (
    <div className="flex flex-col gap-8">
      <ProjectPanel projects={projects} clients={clients} />

      <WeekGrid weekStart={weekStart} entries={entries} projects={activeProjects} />

      <ConvertDialog projects={activeProjects} />

      <ProfitabilityPanel projects={profitability} clientRanking={clientRanking} />
    </div>
  )
}
