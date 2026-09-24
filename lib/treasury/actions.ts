'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { bankAccounts, categoryRules, files, invoiceAuditLog, invoicePayments, invoices, transactionCategories, transactions } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { eurosToCents } from '@/lib/money'
import { deleteStoredFile, generateStorageKey, saveFile } from '@/lib/storage'
import { validateUpload } from '@/lib/uploads'

export type ActionResult = { error?: string; success?: boolean }

type InvoiceStatus = (typeof invoices.$inferSelect)['status']

/**
 * Même règle de statut que l'émission/paiement direct d'une facture
 * (lib/invoicing/actions.ts), dupliquée volontairement ici : 'use server'
 * n'autorise que des exports async, donc pas de helper partagé exporté
 * sans créer un fichier dédié pour une seule fonction pure de 3 lignes.
 */
function computeInvoiceStatusAfterPayment(invoice: { totalTtcCents: number; dueDate: string | null }, paidAmountCents: number): InvoiceStatus {
  if (paidAmountCents >= invoice.totalTtcCents) return 'paid'
  if (paidAmountCents > 0) return 'partially_paid'
  if (!invoice.dueDate) return 'issued'
  const today = new Date().toISOString().slice(0, 10)
  return invoice.dueDate < today ? 'overdue' : 'issued'
}

// --- Comptes bancaires -------------------------------------------------

const bankAccountSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.'),
  iban: z.string().trim().optional(),
  openingBalance: z.coerce.number().default(0),
})

export async function createBankAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = bankAccountSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx.insert(bankAccounts).values({
      userId: session.user.id,
      name: parsed.data.name,
      iban: parsed.data.iban || null,
      openingBalanceCents: eurosToCents(parsed.data.openingBalance),
    }),
  )

  revalidatePath('/treasury')
  return { success: true }
}

export async function archiveBankAccountAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(bankAccounts).set({ archivedAt: new Date() }).where(eq(bankAccounts.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

export async function unarchiveBankAccountAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(bankAccounts).set({ archivedAt: null }).where(eq(bankAccounts.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

// --- Catégories et règles de catégorisation -----------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.'),
  kind: z.enum(['income', 'expense']),
  color: z.string().trim().optional(),
})

export async function createCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  try {
    await withCurrentUserScope((tx) =>
      tx.insert(transactionCategories).values({ userId: session.user.id, name: parsed.data.name, kind: parsed.data.kind, color: parsed.data.color || null }),
    )
  } catch {
    return { error: 'Une catégorie porte déjà ce nom.' }
  }

  revalidatePath('/treasury')
  return { success: true }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.delete(transactionCategories).where(eq(transactionCategories.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

/**
 * Ré-insère une catégorie supprimée et ses règles (supprimées en cascade
 * avec elle) — annulation depuis le toast. Les deux insertions sont dans la
 * même transaction scopée : soit tout revient, soit rien.
 */
export async function restoreCategoryAction(
  category: typeof transactionCategories.$inferSelect,
  rules: (typeof categoryRules.$inferSelect)[],
): Promise<ActionResult> {
  await withCurrentUserScope(async (tx) => {
    await tx.insert(transactionCategories).values(category)
    if (rules.length > 0) await tx.insert(categoryRules).values(rules)
  })
  revalidatePath('/treasury')
  return { success: true }
}

const categoryRuleSchema = z.object({
  matchPattern: z.string().trim().min(1, 'Le motif est requis.'),
  categoryId: z.string().min(1, 'Catégorie requise.'),
})

export async function createCategoryRuleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = categoryRuleSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx.insert(categoryRules).values({ userId: session.user.id, matchPattern: parsed.data.matchPattern, categoryId: parsed.data.categoryId }),
  )

  revalidatePath('/treasury')
  return { success: true }
}

export async function deleteCategoryRuleAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.delete(categoryRules).where(eq(categoryRules.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

export async function restoreCategoryRuleAction(rule: typeof categoryRules.$inferSelect): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.insert(categoryRules).values(rule))
  revalidatePath('/treasury')
  return { success: true }
}

// --- Transactions --------------------------------------------------------

const transactionSchema = z.object({
  bankAccountId: z.string().min(1, 'Compte requis.'),
  date: z.iso.date(),
  label: z.string().trim().min(1, 'Le libellé est requis.'),
  amount: z.coerce.number().positive('Le montant doit être positif.'),
  direction: z.enum(['income', 'expense']),
  categoryId: z.string().optional(),
  notes: z.string().trim().optional(),
})

async function readReceiptFromFormData(formData: FormData): Promise<
  { ok: true; file: { buffer: Buffer; name: string; mimeType: string; size: number } | null } | { ok: false; error: string }
> {
  const receipt = formData.get('receipt')
  if (!(receipt instanceof File) || receipt.size === 0) return { ok: true, file: null }

  const buffer = Buffer.from(await receipt.arrayBuffer())
  const validation = validateUpload(receipt.name, receipt.size, buffer)
  if (!validation.ok) return { ok: false, error: validation.error }

  return { ok: true, file: { buffer, name: receipt.name, mimeType: validation.mimeType, size: receipt.size } }
}

async function trySaveFile(buffer: Buffer, key: string): Promise<{ ok: true; storedPath: string } | { ok: false; error: string }> {
  try {
    return { ok: true, storedPath: (await saveFile(buffer, key)).storedPath }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Échec de l’enregistrement du justificatif.' }
  }
}

export async function createTransactionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const receiptResult = await readReceiptFromFormData(formData)
  if (!receiptResult.ok) return { error: receiptResult.error }

  const session = await requireSession()
  const amountCents = eurosToCents(parsed.data.amount) * (parsed.data.direction === 'expense' ? -1 : 1)

  let storedPath: string | null = null
  if (receiptResult.file) {
    const key = generateStorageKey(session.user.id, receiptResult.file.name)
    const saved = await trySaveFile(receiptResult.file.buffer, key)
    if (!saved.ok) return { error: saved.error }
    storedPath = saved.storedPath
  }

  await withCurrentUserScope(async (tx) => {
    let categoryId = parsed.data.categoryId || null
    if (!categoryId) {
      const rules = await tx.select().from(categoryRules).where(eq(categoryRules.userId, session.user.id))
      categoryId = rules.find((rule) => parsed.data.label.toLowerCase().includes(rule.matchPattern.toLowerCase()))?.categoryId ?? null
    }

    let receiptFileId: string | null = null
    if (storedPath && receiptResult.file) {
      const [file] = await tx
        .insert(files)
        .values({
          userId: session.user.id,
          kind: 'receipt',
          originalName: receiptResult.file.name,
          storedPath,
          mimeType: receiptResult.file.mimeType,
          sizeBytes: receiptResult.file.size,
        })
        .returning()
      receiptFileId = file.id
    }

    await tx.insert(transactions).values({
      userId: session.user.id,
      bankAccountId: parsed.data.bankAccountId,
      date: parsed.data.date,
      label: parsed.data.label,
      amountCents,
      categoryId,
      receiptFileId,
      notes: parsed.data.notes || null,
    })
  })

  revalidatePath('/treasury')
  return { success: true }
}

export async function updateTransactionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const receiptResult = await readReceiptFromFormData(formData)
  if (!receiptResult.ok) return { error: receiptResult.error }

  const session = await requireSession()
  const amountCents = eurosToCents(parsed.data.amount) * (parsed.data.direction === 'expense' ? -1 : 1)

  let newStoredPath: string | null = null
  if (receiptResult.file) {
    const key = generateStorageKey(session.user.id, receiptResult.file.name)
    const saved = await trySaveFile(receiptResult.file.buffer, key)
    if (!saved.ok) return { error: saved.error }
    newStoredPath = saved.storedPath
  }

  let oldReceiptStoredPath: string | null = null

  try {
    await withCurrentUserScope(async (tx) => {
      const existing = await tx.query.transactions.findFirst({ where: eq(transactions.id, id) })
      if (!existing) throw new Error('Transaction introuvable.')

      let receiptFileId = existing.receiptFileId
      if (newStoredPath && receiptResult.file) {
        if (existing.receiptFileId) {
          const oldFile = await tx.query.files.findFirst({ where: eq(files.id, existing.receiptFileId) })
          oldReceiptStoredPath = oldFile?.storedPath ?? null
          if (oldFile) await tx.delete(files).where(eq(files.id, oldFile.id))
        }
        const [file] = await tx
          .insert(files)
          .values({
            userId: session.user.id,
            kind: 'receipt',
            originalName: receiptResult.file.name,
            storedPath: newStoredPath,
            mimeType: receiptResult.file.mimeType,
            sizeBytes: receiptResult.file.size,
          })
          .returning()
        receiptFileId = file.id
      }

      await tx
        .update(transactions)
        .set({
          bankAccountId: parsed.data.bankAccountId,
          date: parsed.data.date,
          label: parsed.data.label,
          amountCents,
          categoryId: parsed.data.categoryId || null,
          receiptFileId,
          notes: parsed.data.notes || null,
        })
        .where(eq(transactions.id, id))
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }

  if (oldReceiptStoredPath) await deleteStoredFile(oldReceiptStoredPath).catch(() => undefined)

  revalidatePath('/treasury')
  return { success: true }
}

/**
 * Supprime la transaction. Si elle était rapprochée avec une ou plusieurs
 * factures, annule ces paiements et recalcule le statut des factures
 * concernées — jamais de solde facture orphelin d'une transaction disparue.
 */
export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  let receiptStoredPath: string | null = null

  try {
    receiptStoredPath = await withCurrentUserScope(async (tx) => {
      const transaction = await tx.query.transactions.findFirst({ where: eq(transactions.id, id) })
      if (!transaction) throw new Error('Transaction introuvable.')

      const payments = await tx.select().from(invoicePayments).where(eq(invoicePayments.transactionId, id))
      for (const payment of payments) {
        const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, payment.invoiceId) })
        if (invoice) {
          const newPaidAmount = Math.max(0, invoice.paidAmountCents - payment.amountCents)
          const newStatus = computeInvoiceStatusAfterPayment({ totalTtcCents: invoice.totalTtcCents, dueDate: invoice.dueDate }, newPaidAmount)
          await tx.update(invoices).set({ paidAmountCents: newPaidAmount, status: newStatus }).where(eq(invoices.id, invoice.id))
        }
        await tx.delete(invoicePayments).where(eq(invoicePayments.id, payment.id))
      }

      let storedPath: string | null = null
      if (transaction.receiptFileId) {
        const file = await tx.query.files.findFirst({ where: eq(files.id, transaction.receiptFileId) })
        storedPath = file?.storedPath ?? null
        if (file) await tx.delete(files).where(eq(files.id, file.id))
      }

      await tx.delete(transactions).where(eq(transactions.id, id))
      return storedPath
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }

  if (receiptStoredPath) await deleteStoredFile(receiptStoredPath).catch(() => undefined)

  revalidatePath('/treasury')
  revalidatePath('/invoices')
  return { success: true }
}

// --- Rapprochement facture <-> transaction --------------------------------

const reconcileSchema = z.object({
  transactionId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive('Le montant doit être positif.'),
  paidAt: z.iso.date(),
})

export async function reconcileTransactionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = reconcileSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: 'Données de rapprochement invalides.' }

  const session = await requireSession()
  const amountCents = eurosToCents(parsed.data.amount)

  try {
    await withCurrentUserScope(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, parsed.data.invoiceId) })
      if (!invoice) throw new Error('Facture introuvable.')
      if (invoice.status === 'draft' || invoice.status === 'cancelled') throw new Error('Cette facture ne peut pas être rapprochée.')

      await tx.insert(invoicePayments).values({
        invoiceId: invoice.id,
        transactionId: parsed.data.transactionId,
        amountCents,
        paidAt: parsed.data.paidAt,
        method: 'virement',
      })

      const newPaidAmount = invoice.paidAmountCents + amountCents
      const newStatus = computeInvoiceStatusAfterPayment({ totalTtcCents: invoice.totalTtcCents, dueDate: invoice.dueDate }, newPaidAmount)
      await tx.update(invoices).set({ paidAmountCents: newPaidAmount, status: newStatus }).where(eq(invoices.id, invoice.id))

      await tx.insert(invoiceAuditLog).values({
        invoiceId: invoice.id,
        event: newStatus === 'paid' ? 'paid' : 'payment_recorded',
        actorUserId: session.user.id,
        metadata: { amountCents, paidAt: parsed.data.paidAt, transactionId: parsed.data.transactionId, source: 'reconciliation' },
      })
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }

  revalidatePath('/treasury')
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${parsed.data.invoiceId}`)
  return { success: true }
}

export async function removeInvoicePaymentAction(paymentId: string): Promise<ActionResult> {
  const session = await requireSession()

  try {
    await withCurrentUserScope(async (tx) => {
      const payment = await tx.query.invoicePayments.findFirst({ where: eq(invoicePayments.id, paymentId) })
      if (!payment) throw new Error('Paiement introuvable.')
      const invoice = await tx.query.invoices.findFirst({ where: eq(invoices.id, payment.invoiceId) })
      if (!invoice) throw new Error('Facture introuvable.')

      const newPaidAmount = Math.max(0, invoice.paidAmountCents - payment.amountCents)
      const newStatus = computeInvoiceStatusAfterPayment({ totalTtcCents: invoice.totalTtcCents, dueDate: invoice.dueDate }, newPaidAmount)
      await tx.update(invoices).set({ paidAmountCents: newPaidAmount, status: newStatus }).where(eq(invoices.id, invoice.id))
      await tx.delete(invoicePayments).where(eq(invoicePayments.id, paymentId))

      await tx.insert(invoiceAuditLog).values({
        invoiceId: invoice.id,
        event: 'payment_recorded',
        actorUserId: session.user.id,
        metadata: { reverted: true, amountCents: -payment.amountCents },
      })
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }

  revalidatePath('/treasury')
  revalidatePath('/invoices')
  return { success: true }
}
