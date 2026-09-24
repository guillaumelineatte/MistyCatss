'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { userPreferences } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { eurosToCents } from '@/lib/money'

export type ActionResult = { error?: string; success?: boolean }

const goalSchema = z.object({ annualGoal: z.coerce.number().positive('Objectif invalide.') })

export async function setRevenueGoalAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = goalSchema.safeParse({ annualGoal: formData.get('annualGoal') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  const annualRevenueGoalCents = eurosToCents(parsed.data.annualGoal)

  await withCurrentUserScope((tx) =>
    tx
      .insert(userPreferences)
      .values({ userId: session.user.id, annualRevenueGoalCents })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { annualRevenueGoalCents, updatedAt: new Date() } }),
  )

  revalidatePath('/forecast')
  return { success: true }
}
