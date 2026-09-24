'use server'

import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { db } from '@/db/client'
import { invoiceLines, invoices, quoteLines, quotes } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { formatDocumentNumber, getNextDocumentNumber, getOrCreateSeries } from '@/lib/documents/numbering'
import { computeDocumentTotals, computeLineTotals } from '@/lib/money'
import { sendEmail } from '@/lib/email'
import { quoteSentEmail } from '@/lib/email/templates'
import { getAppUrl } from '@/lib/env'

export type ActionResult = { error?: string; success?: boolean }

const lineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPriceCents: z.coerce.number().int(),
  discountPercentBasisPoints: z.coerce.number().int().nullable().optional(),
  discountAmountCents: z.coerce.number().int().nullable().optional(),
  vatRateBasisPoints: z.coerce.number().int().min(0),
})

const quoteFormSchema = z.object({
  clientId: z.string().min(1, 'Client requis.'),
  issueDate: z.iso.date(),
  validUntil: z.iso.date().optional().or(z.literal('')),
  notes: z.string().optional(),
  lines: z.string().transform((value, ctx) => {
    try {
      const parsed = JSON.parse(value)
      return z.array(lineSchema).min(1, 'Au moins une ligne est requise.').parse(parsed)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Lignes invalides.' })
      return z.NEVER
    }
  }),
})

async function upsertQuoteLines(tx: import('@/lib/db/scope').Transaction, quoteId: string, lines: z.infer<typeof lineSchema>[]) {
  await tx.delete(quoteLines).where(eq(quoteLines.quoteId, quoteId))
  for (const [index, line] of lines.entries()) {
    const totals = computeLineTotals(line)
    await tx.insert(quoteLines).values({
      quoteId,
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

export async function createQuoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = quoteFormSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  const totals = computeDocumentTotals(parsed.data.lines)

  const quoteId = await withCurrentUserScope(async (tx) => {
    const [quote] = await tx
      .insert(quotes)
      .values({
        userId: session.user.id,
        clientId: parsed.data.clientId,
        issueDate: parsed.data.issueDate,
        validUntil: parsed.data.validUntil || null,
        notes: parsed.data.notes || null,
        publicToken: randomUUID(),
        ...totals,
      })
      .returning()
    await upsertQuoteLines(tx, quote.id, parsed.data.lines)
    return quote.id
  })

  revalidatePath('/invoices')
  redirect(`/quotes/${quoteId}`)
}

export async function updateQuoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = quoteFormSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const totals = computeDocumentTotals(parsed.data.lines)

  await withCurrentUserScope(async (tx) => {
    const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, id) })
    if (!quote || quote.status !== 'draft') {
      throw new Error('Seul un devis brouillon peut être modifié.')
    }
    await tx
      .update(quotes)
      .set({
        clientId: parsed.data.clientId,
        issueDate: parsed.data.issueDate,
        validUntil: parsed.data.validUntil || null,
        notes: parsed.data.notes || null,
        ...totals,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id))
    await upsertQuoteLines(tx, id, parsed.data.lines)
  })

  revalidatePath(`/quotes/${id}`)
  return { success: true }
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope(async (tx) => {
    const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, id) })
    if (!quote || quote.status !== 'draft') throw new Error('Seul un devis brouillon peut être supprimé.')
    await tx.delete(quotes).where(eq(quotes.id, id))
  })
  revalidatePath('/invoices')
  redirect('/invoices')
}

/**
 * Pondération du pipeline prévisionnel (Phase 8) : chance de signature
 * estimée par l'utilisateur pour ce devis, jamais déduite automatiquement.
 * `null` (champ vidé) restaure le comportement "pondéré à 100 %".
 */
export async function setQuoteWinProbabilityAction(id: string, winProbabilityPercent: number | null): Promise<ActionResult> {
  if (winProbabilityPercent != null && (winProbabilityPercent < 0 || winProbabilityPercent > 100)) {
    return { error: 'La probabilité doit être comprise entre 0 et 100.' }
  }
  await withCurrentUserScope((tx) =>
    tx
      .update(quotes)
      .set({ winProbabilityBasisPoints: winProbabilityPercent != null ? Math.round(winProbabilityPercent * 100) : null })
      .where(eq(quotes.id, id)),
  )
  revalidatePath('/forecast')
  revalidatePath('/invoices')
  return { success: true }
}

export async function duplicateQuoteAction(id: string): Promise<{ error?: string; newId?: string }> {
  const session = await requireSession()
  const newId = await withCurrentUserScope(async (tx) => {
    const source = await tx.query.quotes.findFirst({ where: eq(quotes.id, id) })
    if (!source) throw new Error('Devis introuvable.')

    const [copy] = await tx
      .insert(quotes)
      .values({
        userId: session.user.id,
        clientId: source.clientId,
        issueDate: new Date().toISOString().slice(0, 10),
        validUntil: source.validUntil,
        notes: source.notes,
        publicToken: randomUUID(),
        totalHtCents: source.totalHtCents,
        totalVatCents: source.totalVatCents,
        totalTtcCents: source.totalTtcCents,
      })
      .returning()

    const sourceLines = await tx.select().from(quoteLines).where(eq(quoteLines.quoteId, id))
    for (const line of sourceLines) {
      await tx.insert(quoteLines).values({
        quoteId: copy.id,
        position: line.position,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountPercentBasisPoints: line.discountPercentBasisPoints,
        discountAmountCents: line.discountAmountCents,
        vatRateBasisPoints: line.vatRateBasisPoints,
        lineTotalHtCents: line.lineTotalHtCents,
      })
    }
    return copy.id
  })

  revalidatePath('/invoices')
  return { newId }
}

export async function sendQuoteAction(id: string): Promise<ActionResult> {
  const session = await requireSession()

  const quote = await withCurrentUserScope(async (tx) => {
    const existing = await tx.query.quotes.findFirst({ where: eq(quotes.id, id), with: { client: true } })
    if (!existing) throw new Error('Devis introuvable.')

    let number = existing.number
    if (!number) {
      const series = await getOrCreateSeries(tx, session.user.id, 'quote')
      const year = new Date(existing.issueDate).getFullYear()
      const seq = await getNextDocumentNumber(tx, series.id, series.yearlyReset ? year : 0)
      number = formatDocumentNumber(series.prefix, series.paddingLength, series.yearlyReset, year, seq)
    }

    const [updated] = await tx
      .update(quotes)
      .set({ status: 'sent', number, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning()
    return { ...updated, client: existing.client }
  })

  if (quote.client?.contactEmail) {
    const publicUrl = `${getAppUrl()}/public/quotes/${quote.publicToken}`
    const { subject, html } = quoteSentEmail(quote.number ?? '', publicUrl)
    await sendEmail({ to: quote.client.contactEmail, subject, html })
  }

  revalidatePath(`/quotes/${id}`)
  revalidatePath('/invoices')
  return { success: true }
}

/** Conversion en facture (brouillon) : reprend les lignes, référence le devis. Émission = Phase 6. */
export async function convertQuoteToInvoiceAction(id: string): Promise<{ error?: string; invoiceId?: string }> {
  const session = await requireSession()

  const invoiceId = await withCurrentUserScope(async (tx) => {
    const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, id) })
    if (!quote) throw new Error('Devis introuvable.')
    if (quote.status !== 'accepted') throw new Error('Seul un devis accepté peut être converti en facture.')

    const [invoice] = await tx
      .insert(invoices)
      .values({
        userId: session.user.id,
        clientId: quote.clientId,
        quoteId: quote.id,
        type: 'standard',
        status: 'draft',
        saleDate: new Date().toISOString().slice(0, 10),
        notes: quote.notes,
        totalHtCents: quote.totalHtCents,
        totalVatCents: quote.totalVatCents,
        totalTtcCents: quote.totalTtcCents,
      })
      .returning()

    const sourceLines = await tx.select().from(quoteLines).where(eq(quoteLines.quoteId, id))
    for (const line of sourceLines) {
      await tx.insert(invoiceLines).values({
        invoiceId: invoice.id,
        position: line.position,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountPercentBasisPoints: line.discountPercentBasisPoints,
        discountAmountCents: line.discountAmountCents,
        vatRateBasisPoints: line.vatRateBasisPoints,
        lineTotalHtCents: line.lineTotalHtCents,
      })
    }
    return invoice.id
  })

  revalidatePath('/invoices')
  return { invoiceId }
}

// --- Actions publiques (consultation par jeton, sans session) --------------

const publicResponseSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(['accepted', 'refused']),
})

export async function respondToPublicQuoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = publicResponseSchema.safeParse({ token: formData.get('token'), decision: formData.get('decision') })
  if (!parsed.success) return { error: 'Requête invalide.' }

  // Accès public par jeton non devinable (UUID) : pas de session, donc pas de
  // withCurrentUserScope possible ici. Le jeton fait office de clé d'accès —
  // la clause WHERE ci-dessous exige de le connaître pour affecter une ligne.
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.publicToken, parsed.data.token) })
  if (!quote) return { error: 'Devis introuvable.' }
  if (quote.status !== 'sent') return { error: 'Ce devis ne peut plus être accepté ou refusé.' }

  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? requestHeaders.get('x-real-ip') ?? null

  await db
    .update(quotes)
    .set({
      status: parsed.data.decision,
      acceptedAt: parsed.data.decision === 'accepted' ? new Date() : null,
      acceptedIp: parsed.data.decision === 'accepted' ? ip : null,
    })
    .where(and(eq(quotes.id, quote.id), eq(quotes.publicToken, parsed.data.token)))

  return { success: true }
}
