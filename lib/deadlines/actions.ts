'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { deadlines } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { deadlineReminderEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email'
import { eurosToCents, formatEuros } from '@/lib/money'

export type ActionResult = { error?: string; success?: boolean }

const deadlineSchema = z.object({
  kind: z.enum(['urssaf', 'tva', 'is', 'cfe']),
  dueDate: z.iso.date(),
  amountEstimate: z.coerce.number().optional(),
})

export async function createDeadlineAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = deadlineSchema.safeParse({
    kind: formData.get('kind'),
    dueDate: formData.get('dueDate'),
    amountEstimate: formData.get('amountEstimate') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx.insert(deadlines).values({
      userId: session.user.id,
      kind: parsed.data.kind,
      dueDate: parsed.data.dueDate,
      amountEstimateCents: parsed.data.amountEstimate != null ? eurosToCents(parsed.data.amountEstimate) : null,
    }),
  )

  revalidatePath('/treasury')
  return { success: true }
}

export async function markDeadlineAction(id: string, status: 'done' | 'skipped' | 'pending'): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(deadlines).set({ status }).where(eq(deadlines.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

export async function deleteDeadlineAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.delete(deadlines).where(eq(deadlines.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

/** Ré-insère une échéance supprimée à l'identique (même id) — annulation depuis le toast. */
export async function restoreDeadlineAction(deadline: typeof deadlines.$inferSelect): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.insert(deadlines).values(deadline))
  revalidatePath('/treasury')
  return { success: true }
}

export async function sendDeadlineReminderAction(id: string): Promise<ActionResult> {
  const session = await requireSession()
  const deadline = await withCurrentUserScope((tx) => tx.query.deadlines.findFirst({ where: eq(deadlines.id, id) }))
  if (!deadline) return { error: 'Échéance introuvable.' }
  if (!session.user.email) return { error: 'Aucun email associé au compte.' }

  const { subject, html } = deadlineReminderEmail(
    deadline.kind,
    deadline.dueDate,
    deadline.amountEstimateCents != null ? formatEuros(deadline.amountEstimateCents) : null,
  )
  await sendEmail({ to: session.user.email, subject, html })
  await withCurrentUserScope((tx) => tx.update(deadlines).set({ reminderSentAt: new Date() }).where(eq(deadlines.id, id)))

  revalidatePath('/treasury')
  return { success: true }
}
