'use server'

import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { db } from '@/db/client'
import {
  companies,
  invoiceAuditLog,
  invoiceLines,
  invoicePayments,
  invoiceReminders,
  invoices,
} from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { invoiceExporter } from '@/lib/documents/invoice-exporter'
import { formatDocumentNumber, getNextDocumentNumber, getOrCreateSeries } from '@/lib/documents/numbering'
import { sendEmail } from '@/lib/email'
import { invoiceReminderEmail, invoiceSentEmail } from '@/lib/email/templates'
import { getAppUrl } from '@/lib/env'
import { resolveLegalMentions } from '@/lib/invoicing/legal-mentions'
import { getStatusPeriodAtDate } from '@/lib/invoicing/queries'
import { computeDocumentTotals, computeLineTotals, formatEuros } from '@/lib/money'

export type ActionResult = { error?: string; success?: boolean }

const lineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int(),
  discountPercentBasisPoints: z.coerce.number().int().nullable().optional(),
  discountAmountCents: z.coerce.number().int().nullable().optional(),
  vatRateBasisPoints: z.coerce.number().int().min(0),
})

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, 'Client requis.'),
  saleDate: z.iso.date(),
  paymentTermsDays: z.coerce.number().int().min(0).default(30),
  notes: z.string().optional(),
  lines: z.string().transform((value, ctx) => {
    try {
      return z.array(lineSchema).min(1, 'Au moins une ligne est requise.').parse(JSON.parse(value))
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Lignes invalides.' })
      return z.NEVER
    }
  }),
})

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function insertLines(tx: import('@/lib/db/scope').Transaction, invoiceId: string, lines: z.infer<typeof lineSchema>[]) {
  for (const [index, line] of lines.entries()) {
    const totals = computeLineTotals(line)
    await tx.insert(invoiceLines).values({
      invoiceId,
      position: index,
      description: line.description,
      quantity: String(line.quantity),
      unitPriceCents: line.unitPriceCents,
      discountPercentBasisPoints: line.discountPercentBasisPoints ?? null,
      discountAmountCents: line.discountAmountCents ?? null,
      vatRateBasisPoints: line.vatRateBasisPoints,
      lineTotalHtCents: totals.lineTotalHtCents,
    })
  }
}

export async function createInvoiceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = invoiceFormSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  const totals = computeDocumentTotals(parsed.data.lines)
  const dueDate = addDays(parsed.data.saleDate, parsed.data.paymentTermsDays)

  const invoiceId = await withCurrentUserScope(async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({
        userId: session.user.id,
        clientId: parsed.data.clientId,
        type: 'standard',
        status: 'draft',
        saleDate: parsed.data.saleDate,
        dueDate,
        paymentTermsDays: parsed.data.paymentTermsDays,
        notes: parsed.data.notes || null,
        publicToken: randomUUID(),
        ...totals,
      })
      .returning()
    await insertLines(tx, invoice.id, parsed.data.lines)
    await tx.insert(invoiceAuditLog).values({ invoiceId: invoice.id, event: 'created', actorUserId: session.user.id })
    return invoice.id
  })

  revalidatePath('/invoices')
  redirect(`/invoices/${invoiceId}`)
}

export async function updateInvoiceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = invoiceFormSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const totals = computeDocumentTotals(parsed.data.lines)
  const dueDate = addDays(parsed.data.saleDate, parsed.data.paymentTermsDays)

  await withCurrentUserScope(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, id) })
    if (!invoice || invoice.status !== 'draft') throw new Error('Seule une facture brouillon peut être modifiée.')

    await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id))
    await tx
      .update(invoices)
      .set({
        clientId: parsed.data.clientId,
        saleDate: parsed.data.saleDate,
        dueDate,
        paymentTermsDays: parsed.data.paymentTermsDays,
        notes: parsed.data.notes || null,
        ...totals,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
    await insertLines(tx, id, parsed.data.lines)
  })

  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, id) })
    if (!invoice || invoice.status !== 'draft') throw new Error('Seule une facture brouillon peut être supprimée.')
    await tx.delete(invoices).where(eq(invoices.id, id))
  })
  revalidatePath('/invoices')
  redirect('/invoices')
}

/**
 * ÉMISSION — la seule opération qui attribue un numéro, jamais avant. Tout
 * se fait dans UNE transaction scopée : le trigger d'immuabilité (migration
 * 0002) autorise ce changement précisément parce qu'il part de status =
 * 'draft' ; toute tentative ultérieure de modifier les montants échouera.
 */
export async function issueInvoiceAction(id: string): Promise<ActionResult> {
  const session = await requireSession()

  try {
    await withCurrentUserScope(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, id) })
      if (!invoice) throw new Error('Facture introuvable.')
      if (invoice.status !== 'draft') throw new Error('Cette facture a déjà été émise.')

      const issueDate = new Date().toISOString().slice(0, 10)
      const statusPeriod = await getStatusPeriodAtDate(session.user.id, issueDate)
      const company = await tx.query.companies.findFirst({ where: eq(companies.userId, session.user.id) })
      const mentionsResult = resolveLegalMentions({ company: company ?? null, statusPeriodAtDate: statusPeriod ?? null })

      const series = await getOrCreateSeries(tx, session.user.id, 'invoice')
      const scopeYear = series.yearlyReset ? new Date(issueDate).getFullYear() : 0
      const seq = await getNextDocumentNumber(tx, series.id, scopeYear)
      const fullNumber = formatDocumentNumber(series.prefix, series.paddingLength, series.yearlyReset, new Date(issueDate).getFullYear(), seq)

      await tx
        .update(invoices)
        .set({
          status: 'issued',
          number: seq,
          fullNumber,
          seriesId: series.id,
          issueDate,
          dueDate: addDays(issueDate, invoice.paymentTermsDays ?? 30),
          escompteConditions: mentionsResult.mentions.escompteConditions ?? null,
          latePenaltyRateBasisPoints: mentionsResult.mentions.latePenaltyRateBasisPoints ?? null,
          lateRecoveryIndemnityCents: mentionsResult.mentions.lateRecoveryIndemnityCents ?? null,
          legalSnapshot: mentionsResult.mentions,
        })
        .where(eq(invoices.id, id))

      await tx.insert(invoiceAuditLog).values({
        invoiceId: id,
        event: 'issued',
        actorUserId: session.user.id,
        metadata: mentionsResult.status === 'missing_params' ? { missingMentions: mentionsResult.missing } : null,
      })
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }

  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  return { success: true }
}

export async function sendInvoiceAction(id: string): Promise<ActionResult> {
  const session = await requireSession()

  const invoice = await withCurrentUserScope(async (tx) => {
    const existing = await tx.query.invoices.findFirst({ where: eq(invoices.id, id), with: { client: true } })
    if (!existing) throw new Error('Facture introuvable.')
    if (existing.status === 'draft') throw new Error("Émets d'abord la facture avant de l'envoyer.")

    await tx.update(invoices).set({ status: 'sent' }).where(eq(invoices.id, id))
    await tx.insert(invoiceAuditLog).values({ invoiceId: id, event: 'sent', actorUserId: session.user.id })
    return existing
  })

  if (invoice.client?.contactEmail) {
    const lines = await withCurrentUserScope((tx) => tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id)))
    const pdf = await invoiceExporter.export({ invoice, lines, client: invoice.client })
    const publicUrl = `${getAppUrl()}/public/invoices/${invoice.publicToken}`
    const { subject, html } = invoiceSentEmail(invoice.fullNumber ?? '', publicUrl)
    await sendEmail({
      to: invoice.client.contactEmail,
      subject,
      html,
      attachments: [{ filename: `facture-${invoice.fullNumber}.pdf`, content: pdf }],
    })
  }

  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

export async function sendReminderAction(id: string): Promise<ActionResult> {
  const session = await requireSession()

  const invoice = await withCurrentUserScope((tx) =>
    tx.query.invoices.findFirst({ where: eq(invoices.id, id), with: { client: true } }),
  )
  if (!invoice) return { error: 'Facture introuvable.' }
  if (!invoice.client?.contactEmail) return { error: 'Aucun email de contact pour ce client.' }

  const dueCents = invoice.totalTtcCents - invoice.paidAmountCents
  const publicUrl = `${getAppUrl()}/public/invoices/${invoice.publicToken}`
  const { subject, html } = invoiceReminderEmail(invoice.fullNumber ?? '', formatEuros(dueCents), publicUrl)
  await sendEmail({ to: invoice.client.contactEmail, subject, html })

  await withCurrentUserScope(async (tx) => {
    await tx.insert(invoiceReminders).values({ invoiceId: id, templateUsed: 'relance_standard' })
    await tx.insert(invoiceAuditLog).values({ invoiceId: id, event: 'reminder_sent', actorUserId: session.user.id })
  })

  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paidAt: z.iso.date(),
  method: z.string().optional(),
})

export async function recordPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = paymentSchema.safeParse({ amount: formData.get('amount'), paidAt: formData.get('paidAt'), method: formData.get('method') })
  if (!parsed.success) return { error: 'Montant ou date invalide.' }

  const session = await requireSession()
  const amountCents = Math.round(parsed.data.amount * 100)

  await withCurrentUserScope(async (tx) => {
    const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, id) })
    if (!invoice) throw new Error('Facture introuvable.')
    if (invoice.status === 'draft') throw new Error('Émets la facture avant d\'enregistrer un paiement.')

    await tx.insert(invoicePayments).values({ invoiceId: id, amountCents, paidAt: parsed.data.paidAt, method: parsed.data.method || null })

    const newPaidAmount = invoice.paidAmountCents + amountCents
    const newStatus = newPaidAmount >= invoice.totalTtcCents ? 'paid' : 'partially_paid'
    await tx.update(invoices).set({ paidAmountCents: newPaidAmount, status: newStatus }).where(eq(invoices.id, id))

    await tx.insert(invoiceAuditLog).values({
      invoiceId: id,
      event: newStatus === 'paid' ? 'paid' : 'payment_recorded',
      actorUserId: session.user.id,
      metadata: { amountCents, paidAt: parsed.data.paidAt },
    })
  })

  revalidatePath(`/invoices/${id}`)
  return { success: true }
}

/**
 * Avoir : reprend tout ou partie des lignes de la facture d'origine en
 * négatif fonctionnel (mêmes montants positifs, type='credit_note' porte la
 * sémantique — voir getClientIndicators qui les soustrait du CA). Émis
 * immédiatement (jamais de brouillon pour un avoir : PROMPT.md ne le demande
 * pas et ça n'aurait pas de sens métier).
 */
async function createCreditNoteInternal(originalInvoiceId: string, lines: z.infer<typeof lineSchema>[] | 'full'): Promise<string> {
  const session = await requireSession()

  return withCurrentUserScope(async (tx) => {
    const original = await tx.query.invoices.findFirst({ where: eq(invoices.id, originalInvoiceId) })
    if (!original) throw new Error('Facture introuvable.')
    if (original.status === 'draft' || original.status === 'cancelled') {
      throw new Error('Seule une facture émise peut donner lieu à un avoir.')
    }

    const creditLines =
      lines === 'full'
        ? (await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, originalInvoiceId))).map((line) => ({
            description: line.description,
            quantity: Number(line.quantity),
            unitPriceCents: line.unitPriceCents,
            discountPercentBasisPoints: line.discountPercentBasisPoints,
            discountAmountCents: line.discountAmountCents,
            vatRateBasisPoints: line.vatRateBasisPoints,
          }))
        : lines

    const totals = computeDocumentTotals(creditLines)
    const issueDate = new Date().toISOString().slice(0, 10)
    const series = await getOrCreateSeries(tx, session.user.id, 'credit_note')
    const scopeYear = series.yearlyReset ? new Date(issueDate).getFullYear() : 0
    const seq = await getNextDocumentNumber(tx, series.id, scopeYear)
    const fullNumber = formatDocumentNumber(series.prefix, series.paddingLength, series.yearlyReset, new Date(issueDate).getFullYear(), seq)

    // Inséré en brouillon d'abord : le trigger d'immuabilité des lignes
    // (migration 0002) exige que la facture parente soit encore 'draft' au
    // moment où ses lignes sont insérées — même contrainte que pour une
    // facture normale (voir issueInvoiceAction).
    const [credit] = await tx
      .insert(invoices)
      .values({
        userId: session.user.id,
        clientId: original.clientId,
        type: 'credit_note',
        status: 'draft',
        creditNoteForInvoiceId: original.id,
        seriesId: series.id,
        number: seq,
        fullNumber,
        issueDate,
        saleDate: issueDate,
        legalSnapshot: original.legalSnapshot,
        ...totals,
      })
      .returning()

    await insertLines(tx, credit.id, creditLines.map((l) => ({ ...l, discountPercentBasisPoints: l.discountPercentBasisPoints ?? null, discountAmountCents: l.discountAmountCents ?? null })))
    await tx.update(invoices).set({ status: 'issued' }).where(eq(invoices.id, credit.id))
    await tx.insert(invoiceAuditLog).values({ invoiceId: credit.id, event: 'created', actorUserId: session.user.id })
    await tx.insert(invoiceAuditLog).values({ invoiceId: credit.id, event: 'issued', actorUserId: session.user.id })
    await tx.insert(invoiceAuditLog).values({
      invoiceId: original.id,
      event: 'credit_note_issued',
      actorUserId: session.user.id,
      metadata: { creditNoteId: credit.id, fullNumber },
    })

    if (lines === 'full') {
      await tx.update(invoices).set({ status: 'cancelled' }).where(eq(invoices.id, original.id))
      await tx.insert(invoiceAuditLog).values({ invoiceId: original.id, event: 'cancelled', actorUserId: session.user.id })
    }

    return credit.id
  })
}

export async function cancelInvoiceAction(id: string): Promise<{ error?: string; creditNoteId?: string }> {
  try {
    const creditNoteId = await createCreditNoteInternal(id, 'full')
    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { creditNoteId }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }
}

export async function createCreditNoteAction(_prev: ActionResult & { creditNoteId?: string }, formData: FormData) {
  const id = String(formData.get('id'))
  const parsed = z.array(lineSchema).safeParse(JSON.parse(String(formData.get('lines') ?? '[]')))
  if (!parsed.success || parsed.data.length === 0) return { error: 'Lignes invalides.' }

  try {
    const creditNoteId = await createCreditNoteInternal(id, parsed.data)
    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return { success: true, creditNoteId }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }
}

// --- Accès public (consultation par jeton, sans session) -------------------

export async function markInvoiceViewedAction(token: string): Promise<void> {
  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.publicToken, token) })
  if (!invoice) return
  await db.insert(invoiceAuditLog).values({ invoiceId: invoice.id, event: 'viewed' })
}
