'use server'

import { randomUUID } from 'node:crypto'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { activeTimers, clients, invoiceAuditLog, invoiceLines, invoices, projects, timeEntries } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { computeLineTotals, eurosToCents } from '@/lib/money'
import { getActiveTimer, listProjects, listUnconvertedBillableEntries } from '@/lib/time/queries'

export type ActionResult = { error?: string; success?: boolean }

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// --- Projets ---------------------------------------------------------------

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.'),
  clientId: z.string().min(1, 'Client requis.'),
  targetDailyRate: z.coerce.number().optional(),
})

export async function createProjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = projectSchema.safeParse({
    name: formData.get('name'),
    clientId: formData.get('clientId'),
    targetDailyRate: formData.get('targetDailyRate') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx.insert(projects).values({
      userId: session.user.id,
      name: parsed.data.name,
      clientId: parsed.data.clientId,
      targetDailyRateCents: parsed.data.targetDailyRate != null ? eurosToCents(parsed.data.targetDailyRate) : null,
    }),
  )

  revalidatePath('/time')
  return { success: true }
}

export async function archiveProjectAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(projects).set({ active: false }).where(eq(projects.id, id)))
  revalidatePath('/time')
  return { success: true }
}

export async function unarchiveProjectAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(projects).set({ active: true }).where(eq(projects.id, id)))
  revalidatePath('/time')
  return { success: true }
}

// --- Entrées de temps --------------------------------------------------------

const timeEntrySchema = z.object({
  projectId: z.string().min(1, 'Projet requis.'),
  date: z.iso.date(),
  hours: z.coerce.number().positive('La durée doit être positive.'),
  billable: z.coerce.boolean(),
  description: z.string().trim().optional(),
})

export async function createTimeEntryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = timeEntrySchema.safeParse({
    projectId: formData.get('projectId'),
    date: formData.get('date'),
    hours: formData.get('hours'),
    billable: formData.get('billable') === 'on',
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx.insert(timeEntries).values({
      userId: session.user.id,
      projectId: parsed.data.projectId,
      date: parsed.data.date,
      durationMinutes: Math.round(parsed.data.hours * 60),
      billable: parsed.data.billable,
      description: parsed.data.description || null,
    }),
  )

  revalidatePath('/time')
  return { success: true }
}

export async function deleteTimeEntryAction(id: string): Promise<ActionResult> {
  try {
    await withCurrentUserScope(async (tx) => {
      const entry = await tx.query.timeEntries.findFirst({ where: eq(timeEntries.id, id) })
      if (!entry) throw new Error('Entrée introuvable.')
      if (entry.invoiceLineId) throw new Error('Cette entrée a déjà été convertie en ligne de facture, elle ne peut plus être supprimée.')
      await tx.delete(timeEntries).where(eq(timeEntries.id, id))
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }
  revalidatePath('/time')
  return { success: true }
}

export async function restoreTimeEntryAction(entry: typeof timeEntries.$inferSelect): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.insert(timeEntries).values(entry))
  revalidatePath('/time')
  return { success: true }
}

// --- Chrono persistant -------------------------------------------------------

/**
 * Point d'entrée pour le widget global (barre d'en-tête, accessible depuis
 * n'importe quel écran) : un Server Component classique ne peut pas être
 * importé dans un Client Component pour y faire ses propres requêtes, donc
 * ce wrapper expose les mêmes lectures via la frontière Server Action.
 */
export async function getTimerWidgetDataAction() {
  const [timer, projectList] = await Promise.all([getActiveTimer(), listProjects()])
  return { timer, projects: projectList }
}

export async function startTimerAction(projectId: string, description: string | null): Promise<ActionResult> {
  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx
      .insert(activeTimers)
      .values({ userId: session.user.id, projectId, description, startedAt: new Date() })
      .onConflictDoUpdate({ target: activeTimers.userId, set: { projectId, description, startedAt: new Date() } }),
  )
  revalidatePath('/')
  return { success: true }
}

/** Arrête le chrono et enregistre le temps écoulé comme une entrée facturable. */
export async function stopTimerAction(): Promise<ActionResult> {
  const session = await requireSession()

  await withCurrentUserScope(async (tx) => {
    const timer = await tx.query.activeTimers.findFirst({ where: eq(activeTimers.userId, session.user.id) })
    if (!timer?.startedAt || !timer.projectId) {
      await tx.delete(activeTimers).where(eq(activeTimers.userId, session.user.id))
      return
    }

    const durationMinutes = Math.max(1, Math.round((Date.now() - timer.startedAt.getTime()) / 60_000))
    await tx.insert(timeEntries).values({
      userId: session.user.id,
      projectId: timer.projectId,
      date: new Date().toISOString().slice(0, 10),
      durationMinutes,
      billable: true,
      description: timer.description,
    })
    await tx.delete(activeTimers).where(eq(activeTimers.userId, session.user.id))
  })

  revalidatePath('/')
  revalidatePath('/time')
  return { success: true }
}

/** Arrête le chrono sans enregistrer d'entrée (démarrage par erreur). */
export async function discardTimerAction(): Promise<ActionResult> {
  const session = await requireSession()
  await withCurrentUserScope((tx) => tx.delete(activeTimers).where(eq(activeTimers.userId, session.user.id)))
  revalidatePath('/')
  return { success: true }
}

// --- Conversion en ligne de facture -----------------------------------------

export async function listUnconvertedEntriesAction(projectId: string) {
  return listUnconvertedBillableEntries(projectId)
}

const convertSchema = z.object({
  projectId: z.string().min(1),
  entryIds: z.array(z.string().min(1)).min(1, 'Sélectionne au moins une entrée.'),
  vatRatePercent: z.coerce.number().min(0).max(100),
})

/**
 * Regroupe les entrées facturables non converties d'un projet en UNE ligne
 * d'une nouvelle facture brouillon. Le taux de TVA n'a JAMAIS de valeur par
 * défaut (PROMPT.md « interdiction d'inventer ») : contrairement au reste de
 * la conversion, il vient obligatoirement du formulaire, comme n'importe
 * quelle ligne saisie à la main.
 */
export async function convertTimeEntriesToInvoiceAction(_prev: ActionResult & { invoiceId?: string }, formData: FormData) {
  const parsed = convertSchema.safeParse({
    projectId: formData.get('projectId'),
    entryIds: formData.getAll('entryIds'),
    vatRatePercent: formData.get('vatRatePercent'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()

  try {
    const invoiceId = await withCurrentUserScope(async (tx) => {
      const project = await tx.query.projects.findFirst({ where: eq(projects.id, parsed.data.projectId) })
      if (!project) throw new Error('Projet introuvable.')

      const client = await tx.query.clients.findFirst({ where: eq(clients.id, project.clientId) })
      if (!client) throw new Error('Client introuvable.')

      const rateCents = project.targetDailyRateCents ?? client.defaultDailyRateCents
      if (!rateCents) throw new Error('Aucun TJM défini pour ce projet ni pour ce client — renseigne-en un avant de convertir.')

      const entries = await tx
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.projectId, project.id), inArray(timeEntries.id, parsed.data.entryIds)))
      const invalid = entries.find((e) => !e.billable || e.invoiceLineId)
      if (invalid) throw new Error('Toutes les entrées doivent être facturables et non déjà converties.')
      if (entries.length === 0) throw new Error('Aucune entrée valide sélectionnée.')

      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
      const days = Math.round((totalMinutes / (8 * 60)) * 100) / 100
      const dates = entries.map((e) => e.date).sort()
      const description = `Prestations ${project.name} du ${dates[0].split('-').reverse().join('/')} au ${dates[dates.length - 1].split('-').reverse().join('/')} (${(totalMinutes / 60).toFixed(1)} h)`

      const totals = computeLineTotals({ quantity: days, unitPriceCents: rateCents, vatRateBasisPoints: Math.round(parsed.data.vatRatePercent * 100) })
      const today = new Date().toISOString().slice(0, 10)

      const [invoice] = await tx
        .insert(invoices)
        .values({
          userId: session.user.id,
          clientId: client.id,
          type: 'standard',
          status: 'draft',
          saleDate: today,
          paymentTermsDays: 30,
          dueDate: addDays(today, 30),
          notes: null,
          publicToken: randomUUID(),
          totalHtCents: totals.lineTotalHtCents,
          totalVatCents: totals.vatCents,
          totalTtcCents: totals.lineTotalTtcCents,
        })
        .returning()
      await tx.insert(invoiceAuditLog).values({ invoiceId: invoice.id, event: 'created', actorUserId: session.user.id })

      const [line] = await tx
        .insert(invoiceLines)
        .values({
          invoiceId: invoice.id,
          position: 0,
          description,
          quantity: String(days),
          unitPriceCents: rateCents,
          vatRateBasisPoints: Math.round(parsed.data.vatRatePercent * 100),
          lineTotalHtCents: totals.lineTotalHtCents,
        })
        .returning()

      await tx
        .update(timeEntries)
        .set({ invoiceLineId: line.id })
        .where(inArray(timeEntries.id, entries.map((e) => e.id)))

      return invoice.id
    })

    revalidatePath('/time')
    revalidatePath('/invoices')
    return { success: true, invoiceId }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }
}
