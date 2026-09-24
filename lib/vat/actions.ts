'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { vatPeriods } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { eurosToCents } from '@/lib/money'
import { computeCollectedVat } from '@/lib/vat/queries'

export type ActionResult = { error?: string; success?: boolean }

const periodSchema = z.object({
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  deductible: z.coerce.number().default(0),
})

/**
 * Prépare (ou met à jour) une déclaration de TVA : la TVA collectée est
 * recalculée depuis les factures (jamais saisie à la main, pour éviter toute
 * divergence), la TVA déductible reste saisie manuellement — l'application ne
 * capture pas de taux de TVA sur les dépenses (Phase 7), donc rien à en
 * déduire automatiquement sans l'inventer.
 */
export async function prepareVatPeriodAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = periodSchema.safeParse({
    periodStart: formData.get('periodStart'),
    periodEnd: formData.get('periodEnd'),
    deductible: formData.get('deductible') || 0,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }
  if (parsed.data.periodEnd < parsed.data.periodStart) return { error: 'La date de fin doit suivre la date de début.' }

  const session = await requireSession()
  const collectedCents = await computeCollectedVat(parsed.data.periodStart, parsed.data.periodEnd)
  const deductibleCents = eurosToCents(parsed.data.deductible)

  await withCurrentUserScope(async (tx) => {
    const existing = await tx.query.vatPeriods.findFirst({
      where: and(eq(vatPeriods.userId, session.user.id), eq(vatPeriods.periodStart, parsed.data.periodStart), eq(vatPeriods.periodEnd, parsed.data.periodEnd)),
    })
    if (existing) {
      if (existing.status === 'filed') throw new Error('Cette déclaration est déjà télédéclarée, elle ne peut plus être modifiée.')
      await tx.update(vatPeriods).set({ collectedCents, deductibleCents, status: 'prepared', preparedAt: new Date() }).where(eq(vatPeriods.id, existing.id))
    } else {
      await tx.insert(vatPeriods).values({
        userId: session.user.id,
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        collectedCents,
        deductibleCents,
        status: 'prepared',
        preparedAt: new Date(),
      })
    }
  })

  revalidatePath('/treasury')
  return { success: true }
}

export async function markVatPeriodFiledAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(vatPeriods).set({ status: 'filed' }).where(eq(vatPeriods.id, id)))
  revalidatePath('/treasury')
  return { success: true }
}

export async function deleteVatPeriodAction(id: string): Promise<ActionResult> {
  try {
    await withCurrentUserScope(async (tx) => {
      const existing = await tx.query.vatPeriods.findFirst({ where: eq(vatPeriods.id, id) })
      if (existing?.status === 'filed') throw new Error('Cette déclaration est déjà télédéclarée, elle ne peut plus être supprimée.')
      await tx.delete(vatPeriods).where(eq(vatPeriods.id, id))
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erreur inconnue.' }
  }
  revalidatePath('/treasury')
  return { success: true }
}
