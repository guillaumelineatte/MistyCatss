import { SectionLabel } from '@/components/finance-shell'
import { formatEuros } from '@/lib/money'
import type { ClientProfitability, ProjectProfitability } from '@/lib/time/queries'

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function ProfitabilityPanel({ projects, clientRanking }: { projects: ProjectProfitability[]; clientRanking: ClientProfitability[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex items-center gap-3">
          <SectionLabel tone="blue">Rentabilité</SectionLabel>
          <h2 className="text-3xl">TJM EFFECTIF PAR PROJET</h2>
        </div>
        <div className="mt-5 flex flex-col gap-3 font-mono text-xs">
          {projects.length === 0 && <p className="text-[var(--ink)]/60">Aucun projet avec du temps saisi.</p>}
          {projects.map((project) => (
            <div key={project.projectId} className="border-b border-[var(--ink)]/30 pb-3">
              <div className="flex justify-between">
                <span>
                  {project.projectName} · {project.clientName}
                </span>
                <span>
                  {project.effectiveDailyRateCents != null ? formatEuros(project.effectiveDailyRateCents) : '—'}
                  {project.targetDailyRateCents != null && ` / ${formatEuros(project.targetDailyRateCents)} cible`}
                </span>
              </div>
              {project.targetDailyRateCents && project.effectiveDailyRateCents != null && (
                <div className="mt-2 h-2 border border-[var(--ink)]">
                  <div
                    className="h-full bg-[var(--blue)]"
                    style={{ width: `${Math.min(100, Math.round((project.effectiveDailyRateCents / project.targetDailyRateCents) * 100))}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-[var(--ink)]/50">
                {formatHours(project.billableMinutes)} facturables · {formatHours(project.nonBillableMinutes)} non facturables
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex items-center gap-3">
          <SectionLabel tone="pink">Classement</SectionLabel>
          <h2 className="text-3xl">CLIENTS PAR RENTABILITÉ</h2>
        </div>
        <div className="mt-5 flex flex-col gap-3 font-mono text-xs">
          {clientRanking.length === 0 && <p className="text-[var(--ink)]/60">Aucun client avec du temps facturable saisi.</p>}
          {clientRanking.map((client, index) => (
            <div key={client.clientId} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-3">
              <span>
                #{index + 1} {client.clientName}
              </span>
              <span>{client.effectiveDailyRateCents != null ? `${formatEuros(client.effectiveDailyRateCents)} / j` : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
