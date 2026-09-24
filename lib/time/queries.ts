import 'server-only'

import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'

import { activeTimers, clients, projects, timeEntries } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export async function listProjects() {
  return withCurrentUserScope((tx) =>
    tx.query.projects.findMany({ where: eq(projects.active, true), with: { client: true }, orderBy: asc(projects.name) }),
  )
}

export async function listAllProjects() {
  return withCurrentUserScope((tx) => tx.query.projects.findMany({ with: { client: true }, orderBy: asc(projects.name) }))
}

export async function listTimeEntriesForWeek(weekStart: string, weekEnd: string) {
  return withCurrentUserScope((tx) =>
    tx.query.timeEntries.findMany({
      where: and(gte(timeEntries.date, weekStart), lte(timeEntries.date, weekEnd)),
      with: { project: { with: { client: true } } },
      orderBy: asc(timeEntries.date),
    }),
  )
}

export async function getActiveTimer() {
  return withCurrentUserScope(async (tx) => {
    const timer = await tx.query.activeTimers.findFirst({ where: (t, { isNotNull }) => isNotNull(t.startedAt) })
    if (!timer?.projectId) return timer ?? null
    const project = await tx.query.projects.findFirst({ where: eq(projects.id, timer.projectId), with: { client: true } })
    return { ...timer, project: project ?? null }
  })
}

export type ProjectProfitability = {
  projectId: string
  projectName: string
  clientName: string
  targetDailyRateCents: number | null
  billableMinutes: number
  nonBillableMinutes: number
  invoicedHtCents: number
  effectiveDailyRateCents: number | null
}

/**
 * TJM effectif = montant HT effectivement facturé (lignes issues d'entrées
 * converties) / temps facturable total passé sur le projet (converti en
 * jours de 8 h) — baisse si du temps facturable n'a jamais été converti ou
 * sous-facturé, ce qui est le signal recherché.
 */
export async function getProjectsProfitability(): Promise<ProjectProfitability[]> {
  return withCurrentUserScope(async (tx) => {
    const allProjects = await tx.query.projects.findMany({ with: { client: true } })
    const results: ProjectProfitability[] = []

    for (const project of allProjects) {
      const entries = await tx.query.timeEntries.findMany({
        where: eq(timeEntries.projectId, project.id),
        with: { invoiceLine: true },
      })
      const billableMinutes = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
      const nonBillableMinutes = entries.filter((e) => !e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
      // Une ligne de facture peut regrouper plusieurs entrées converties
      // ensemble : dédupliquer par ligne avant de sommer, sous peine de
      // compter son montant une fois par entrée contributrice.
      const invoicedLines = new Map(entries.filter((e) => e.invoiceLine).map((e) => [e.invoiceLine!.id, e.invoiceLine!.lineTotalHtCents]))
      const invoicedHtCents = [...invoicedLines.values()].reduce((sum, cents) => sum + cents, 0)
      const billableDays = billableMinutes / (8 * 60)
      results.push({
        projectId: project.id,
        projectName: project.name,
        clientName: project.client.name,
        targetDailyRateCents: project.targetDailyRateCents,
        billableMinutes,
        nonBillableMinutes,
        invoicedHtCents,
        effectiveDailyRateCents: billableDays > 0 ? Math.round(invoicedHtCents / billableDays) : null,
      })
    }

    return results
  })
}

export type ClientProfitability = { clientId: string; clientName: string; invoicedHtCents: number; billableMinutes: number; effectiveDailyRateCents: number | null }

export async function getClientsProfitabilityRanking(): Promise<ClientProfitability[]> {
  const projectStats = await getProjectsProfitability()
  const allClients = await withCurrentUserScope((tx) => tx.select().from(clients))

  const byClient = new Map<string, { invoicedHtCents: number; billableMinutes: number }>()
  const projectRows = await withCurrentUserScope((tx) => tx.select().from(projects))
  const clientIdByProjectId = new Map(projectRows.map((p) => [p.id, p.clientId]))

  for (const stat of projectStats) {
    const clientId = clientIdByProjectId.get(stat.projectId)
    if (!clientId) continue
    const current = byClient.get(clientId) ?? { invoicedHtCents: 0, billableMinutes: 0 }
    byClient.set(clientId, {
      invoicedHtCents: current.invoicedHtCents + stat.invoicedHtCents,
      billableMinutes: current.billableMinutes + stat.billableMinutes,
    })
  }

  return allClients
    .map((client) => {
      const stats = byClient.get(client.id) ?? { invoicedHtCents: 0, billableMinutes: 0 }
      const billableDays = stats.billableMinutes / (8 * 60)
      return {
        clientId: client.id,
        clientName: client.name,
        invoicedHtCents: stats.invoicedHtCents,
        billableMinutes: stats.billableMinutes,
        effectiveDailyRateCents: billableDays > 0 ? Math.round(stats.invoicedHtCents / billableDays) : null,
      }
    })
    .filter((c) => c.billableMinutes > 0)
    .sort((a, b) => (b.effectiveDailyRateCents ?? 0) - (a.effectiveDailyRateCents ?? 0))
}

export async function listUnconvertedBillableEntries(projectId: string) {
  return withCurrentUserScope((tx) =>
    tx
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.projectId, projectId), eq(timeEntries.billable, true), isNull(timeEntries.invoiceLineId)))
      .orderBy(desc(timeEntries.date)),
  )
}
