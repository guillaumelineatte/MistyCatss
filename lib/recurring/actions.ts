'use server'

import { randomUUID } from 'node:crypto'

import { and, eq, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db/client'
import { invoiceAuditLog, invoiceLines, invoices, recurringInvoiceTemplateLines, recurringInvoiceTemplates } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope, withUserScope } from '@/lib/db/scope'
import { computeDocumentTotals, computeLineTotals } from '@/lib/money'
import { getRecurringTemplateWithLines } from '@/lib/recurring/queries'

export type ActionResult = { error?: string; success?: boolean }

const lineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int(),
  discountPercentBasisPoints: z.coerce.number().int().nullable().optional(),
  vatRateBasisPoints: z.coerce.number().int().min(0),
})

const templateSchema = z.object({
  clientId: z.string().min(1, 'Client requis.'),
  label: z.string().trim().min(1, 'Le libellé est requis.'),
  periodicity: z.enum(['monthly', 'quarterly', 'yearly']),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  nextRunDate: z.iso.date(),
  lines: z.string().transform((value, ctx) => {
    try {
      return z.array(lineSchema).min(1, 'Au moins une ligne est requise.').parse(JSON.parse(value))
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Lignes invalides.' })
      return z.NEVER
    }
  }),
})

async function insertTemplateLines(tx: import('@/lib/db/scope').Transaction, templateId: string, lines: z.infer<typeof lineSchema>[]) {
  for (const [index, line] of lines.entries()) {
    await tx.insert(recurringInvoiceTemplateLines).values({
      templateId,
      position: index,
      description: line.description,
      quantity: String(line.quantity),
      unitPriceCents: line.unitPriceCents,
      vatRateBasisPoints: line.vatRateBasisPoints,
    })
  }
}

export async function createRecurringTemplateAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = templateSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope(async (tx) => {
    const [template] = await tx
      .insert(recurringInvoiceTemplates)
      .values({
        userId: session.user.id,
        clientId: parsed.data.clientId,
        label: parsed.data.label,
        periodicity: parsed.data.periodicity,
        dayOfMonth: parsed.data.dayOfMonth ?? null,
        nextRunDate: parsed.data.nextRunDate,
      })
      .returning()
    await insertTemplateLines(tx, template.id, parsed.data.lines)
  })

  revalidatePath('/invoices/recurring')
  return { success: true }
}

export async function updateRecurringTemplateAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = templateSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  await withCurrentUserScope(async (tx) => {
    await tx
      .update(recurringInvoiceTemplates)
      .set({
        clientId: parsed.data.clientId,
        label: parsed.data.label,
        periodicity: parsed.data.periodicity,
        dayOfMonth: parsed.data.dayOfMonth ?? null,
        nextRunDate: parsed.data.nextRunDate,
        updatedAt: new Date(),
      })
      .where(eq(recurringInvoiceTemplates.id, id))
    await tx.delete(recurringInvoiceTemplateLines).where(eq(recurringInvoiceTemplateLines.templateId, id))
    await insertTemplateLines(tx, id, parsed.data.lines)
  })

  revalidatePath('/invoices/recurring')
  return { success: true }
}

export async function toggleRecurringTemplateActiveAction(id: string, active: boolean): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(recurringInvoiceTemplates).set({ active }).where(eq(recurringInvoiceTemplates.id, id)))
  revalidatePath('/invoices/recurring')
  return { success: true }
}

export async function deleteRecurringTemplateAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.delete(recurringInvoiceTemplates).where(eq(recurringInvoiceTemplates.id, id)))
  revalidatePath('/invoices/recurring')
  return { success: true }
}

/** Pont Server Action pour la lecture depuis un Client Component (voir lib/time/actions.ts pour le même pattern). */
export async function getTemplateForEditAction(id: string) {
  return getRecurringTemplateWithLines(id)
}

// --- Génération programmée (consommée par la tâche planifiée, Phase 10) ---

function advanceNextRunDate(current: string, periodicity: 'monthly' | 'quarterly' | 'yearly', dayOfMonth: number | null): string {
  const d = new Date(`${current}T00:00:00Z`)
  const monthsToAdd = periodicity === 'monthly' ? 1 : periodicity === 'quarterly' ? 3 : 12
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd)
  if (dayOfMonth) {
    const lastDayOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    d.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth))
  }
  return d.toISOString().slice(0, 10)
}

/**
 * Génère une facture BROUILLON pour chaque modèle actif dont `next_run_date`
 * est dépassée — jamais d'émission automatique (PROMPT.md). Idempotent : une
 * fois générée, `next_run_date` avance au-delà d'aujourd'hui, donc une
 * exécution répétée le même jour ne régénère rien. Traverse tous les
 * utilisateurs (tâche planifiée, pas de session) via la connexion admin pour
 * la sélection, puis scope chaque écriture par utilisateur.
 */
export async function generateDueRecurringInvoices(referenceDate: string): Promise<{ generated: number; templateIds: string[] }> {
  const dueTemplates = await db
    .select()
    .from(recurringInvoiceTemplates)
    .where(and(eq(recurringInvoiceTemplates.active, true), lte(recurringInvoiceTemplates.nextRunDate, referenceDate)))

  const templateIds: string[] = []

  for (const template of dueTemplates) {
    await withUserScope(template.userId, async (tx) => {
      const lines = await tx
        .select()
        .from(recurringInvoiceTemplateLines)
        .where(eq(recurringInvoiceTemplateLines.templateId, template.id))
        .orderBy(recurringInvoiceTemplateLines.position)
      if (lines.length === 0) return

      const lineInputs = lines.map((line) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPriceCents: line.unitPriceCents,
        vatRateBasisPoints: line.vatRateBasisPoints,
      }))
      const totals = computeDocumentTotals(lineInputs)

      const [invoice] = await tx
        .insert(invoices)
        .values({
          userId: template.userId,
          clientId: template.clientId,
          type: 'standard',
          status: 'draft',
          saleDate: referenceDate,
          notes: `Généré depuis le modèle récurrent « ${template.label} ».`,
          publicToken: randomUUID(),
          recurringTemplateId: template.id,
          totalHtCents: totals.totalHtCents,
          totalVatCents: totals.totalVatCents,
          totalTtcCents: totals.totalTtcCents,
        })
        .returning()

      for (const [index, line] of lineInputs.entries()) {
        const lineTotals = computeLineTotals(line)
        await tx.insert(invoiceLines).values({
          invoiceId: invoice.id,
          position: index,
          description: line.description,
          quantity: String(line.quantity),
          unitPriceCents: line.unitPriceCents,
          vatRateBasisPoints: line.vatRateBasisPoints,
          lineTotalHtCents: lineTotals.lineTotalHtCents,
        })
      }
      await tx.insert(invoiceAuditLog).values({ invoiceId: invoice.id, event: 'created', actorUserId: template.userId })

      await tx
        .update(recurringInvoiceTemplates)
        .set({ nextRunDate: advanceNextRunDate(template.nextRunDate, template.periodicity, template.dayOfMonth), lastGeneratedInvoiceId: invoice.id, updatedAt: new Date() })
        .where(eq(recurringInvoiceTemplates.id, template.id))

      templateIds.push(template.id)
    })
  }

  return { generated: templateIds.length, templateIds }
}
