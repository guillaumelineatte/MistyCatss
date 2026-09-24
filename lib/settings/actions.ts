'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { companies, fiscalParamOverrides, numberingSeries, statusPeriods, userPreferences } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { FISCAL_PARAM_DEFINITIONS_BY_KEY, type FiscalParamKey } from '@/lib/fiscal/param-definitions'

export type ActionResult = { error?: string; success?: boolean }

const eurosToCentsOrNull = (value: FormDataEntryValue | null) => {
  if (!value || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

const companySchema = z.object({
  legalName: z.string().trim().optional(),
  siret: z.string().trim().optional(),
  siren: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  bic: z.string().trim().optional(),
  rcsCity: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.email().optional().or(z.literal('')),
  website: z.string().trim().optional(),
  defaultEscompteConditions: z.string().trim().optional(),
})

export async function updateCompanyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries())
  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const session = await requireSession()
  const shareCapitalCents = eurosToCentsOrNull(formData.get('shareCapital'))
  const defaultLateRecoveryIndemnityCents = eurosToCentsOrNull(formData.get('defaultLateRecoveryIndemnity'))
  const rawPenaltyRate = formData.get('defaultLatePenaltyRate')
  const defaultLatePenaltyRateBasisPoints =
    rawPenaltyRate && rawPenaltyRate !== '' ? Math.round(Number(rawPenaltyRate) * 100) : null

  await withCurrentUserScope((tx) =>
    tx
      .insert(companies)
      .values({
        userId: session.user.id,
        ...parsed.data,
        shareCapitalCents,
        defaultLateRecoveryIndemnityCents,
        defaultLatePenaltyRateBasisPoints,
      })
      .onConflictDoUpdate({
        target: companies.userId,
        set: {
          ...parsed.data,
          shareCapitalCents,
          defaultLateRecoveryIndemnityCents,
          defaultLatePenaltyRateBasisPoints,
          updatedAt: new Date(),
        },
      }),
  )

  revalidatePath('/settings')
  return { success: true }
}

const preferencesSchema = z.object({
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
})

export async function updatePreferencesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse({
    defaultPaymentTermsDays: formData.get('defaultPaymentTermsDays') || undefined,
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const session = await requireSession()
  const defaultDailyRateCents = eurosToCentsOrNull(formData.get('defaultDailyRate'))

  await withCurrentUserScope((tx) =>
    tx
      .insert(userPreferences)
      .values({
        userId: session.user.id,
        defaultDailyRateCents,
        defaultPaymentTermsDays: parsed.data.defaultPaymentTermsDays,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { defaultDailyRateCents, defaultPaymentTermsDays: parsed.data.defaultPaymentTermsDays, updatedAt: new Date() },
      }),
  )

  revalidatePath('/settings')
  return { success: true }
}

export async function updateThemeAction(theme: string): Promise<ActionResult> {
  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx
      .insert(userPreferences)
      .values({ userId: session.user.id, theme })
      .onConflictDoUpdate({ target: userPreferences.userId, set: { theme, updatedAt: new Date() } }),
  )
  return { success: true }
}

const statusPeriodSchema = z.object({
  status: z.enum(['micro', 'eurl', 'sasu']),
  vatRegime: z.enum(['franchise', 'reel_simplifie', 'reel_normal']),
  startDate: z.iso.date(),
})

export async function createStatusPeriodAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = statusPeriodSchema.safeParse({
    status: formData.get('status'),
    vatRegime: formData.get('vatRegime'),
    startDate: formData.get('startDate'),
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const session = await requireSession()
  const { status, vatRegime, startDate } = parsed.data

  try {
    await withCurrentUserScope(async (tx) => {
      const currentOpen = await tx.query.statusPeriods.findFirst({
        where: and(eq(statusPeriods.userId, session.user.id), isNull(statusPeriods.endDate)),
      })

      if (currentOpen) {
        if (startDate <= currentOpen.startDate) {
          throw new Error('La date d\'effet doit être postérieure au début de la période en cours.')
        }
        const previousDay = new Date(startDate)
        previousDay.setUTCDate(previousDay.getUTCDate() - 1)
        await tx
          .update(statusPeriods)
          .set({ endDate: previousDay.toISOString().slice(0, 10) })
          .where(eq(statusPeriods.id, currentOpen.id))
      }

      await tx.insert(statusPeriods).values({ userId: session.user.id, status, vatRegime, startDate })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.'
    return { error: message.includes('exclu') || message.includes('overlap') ? 'Cette période chevauche une période existante.' : message }
  }

  revalidatePath('/settings')
  return { success: true }
}

const fiscalParamsFormSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  status: z.enum(['micro', 'eurl', 'sasu']),
})

// Un champ par clé, nommé `param__<clé>`. Vide = efface l'override existant
// (retour à "manquant"), plutôt que d'écrire une valeur inventée.
export async function upsertFiscalParamsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = fiscalParamsFormSchema.safeParse({ year: formData.get('year'), status: formData.get('status') })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const session = await requireSession()
  const { year, status } = parsed.data

  const entries: { paramKey: FiscalParamKey; value: string | null }[] = []
  for (const [name, rawValue] of formData.entries()) {
    if (!name.startsWith('param__')) continue
    const paramKey = name.slice('param__'.length) as FiscalParamKey
    if (!FISCAL_PARAM_DEFINITIONS_BY_KEY[paramKey]) continue
    const value = String(rawValue).trim()
    entries.push({ paramKey, value: value === '' ? null : value })
  }

  await withCurrentUserScope(async (tx) => {
    for (const { paramKey, value } of entries) {
      if (value === null) {
        await tx
          .delete(fiscalParamOverrides)
          .where(
            and(
              eq(fiscalParamOverrides.userId, session.user.id),
              eq(fiscalParamOverrides.year, year),
              eq(fiscalParamOverrides.status, status),
              eq(fiscalParamOverrides.paramKey, paramKey),
            ),
          )
        continue
      }
      const displayValue = Number(value)
      if (!Number.isFinite(displayValue)) continue
      // Le formulaire affiche des euros ou des % (voir fiscal-year-form.tsx),
      // stockés en base en centimes/points de base — même conversion ×100
      // dans les deux cas (100 points de base = 1 %, 100 centimes = 1 €).
      const storedValue = Math.round(displayValue * 100)
      await tx
        .insert(fiscalParamOverrides)
        .values({ userId: session.user.id, year, status, paramKey, value: String(storedValue) })
        .onConflictDoUpdate({
          target: [
            fiscalParamOverrides.userId,
            fiscalParamOverrides.year,
            fiscalParamOverrides.status,
            fiscalParamOverrides.paramKey,
          ],
          set: { value: String(storedValue), updatedAt: new Date() },
        })
    }
  })

  revalidatePath(`/settings/fiscal/${year}`)
  return { success: true }
}

const numberingSeriesSchema = z.object({
  kind: z.enum(['invoice', 'credit_note', 'quote']),
  prefix: z.string().trim().min(1).max(8),
  yearlyReset: z.coerce.boolean(),
  paddingLength: z.coerce.number().int().min(1).max(10),
})

export async function upsertNumberingSeriesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = numberingSeriesSchema.safeParse({
    kind: formData.get('kind'),
    prefix: formData.get('prefix'),
    yearlyReset: formData.get('yearlyReset') === 'on',
    paddingLength: formData.get('paddingLength'),
  })
  if (!parsed.success) return { error: 'Formulaire invalide.' }

  const session = await requireSession()
  await withCurrentUserScope((tx) =>
    tx
      .insert(numberingSeries)
      .values({ userId: session.user.id, ...parsed.data })
      .onConflictDoUpdate({
        target: [numberingSeries.userId, numberingSeries.kind, numberingSeries.prefix],
        set: { yearlyReset: parsed.data.yearlyReset, paddingLength: parsed.data.paddingLength },
      }),
  )

  revalidatePath('/settings')
  return { success: true }
}

export async function setOnboardingStepAction(step: string, action: 'complete' | 'skip'): Promise<ActionResult> {
  const session = await requireSession()
  await withCurrentUserScope(async (tx) => {
    const existing = await tx.query.userPreferences.findFirst({ where: eq(userPreferences.userId, session.user.id) })
    const steps = new Set(existing?.onboardingCompletedSteps ?? [])
    if (action === 'complete') steps.add(step)
    else steps.add(`${step}:skipped`)

    await tx
      .insert(userPreferences)
      .values({ userId: session.user.id, onboardingCompletedSteps: [...steps] })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { onboardingCompletedSteps: [...steps], updatedAt: new Date() },
      })
  })

  revalidatePath('/onboarding')
  return { success: true }
}
