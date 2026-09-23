'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { clients, invoices, projects, quotes, recurringInvoiceTemplates } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { findPotentialDuplicate } from '@/lib/clients/queries'
import { withCurrentUserScope } from '@/lib/db/scope'
import { eurosToCents } from '@/lib/money'

export type ActionResult = { error?: string; success?: boolean; duplicateWarning?: string }

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.'),
  siret: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  billingAddressLine1: z.string().trim().optional(),
  billingAddressLine2: z.string().trim().optional(),
  billingPostalCode: z.string().trim().optional(),
  billingCity: z.string().trim().optional(),
  billingCountry: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactEmail: z.email().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export async function createClientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const session = await requireSession()
  const confirmDuplicate = formData.get('confirmDuplicate') === 'on'
  const defaultDailyRate = formData.get('defaultDailyRate')
  const defaultPaymentTermsDays = formData.get('defaultPaymentTermsDays')

  if (!confirmDuplicate) {
    const duplicate = await findPotentialDuplicate(parsed.data.name, parsed.data.siret || null)
    if (duplicate) {
      return { duplicateWarning: `Un client similaire existe déjà : "${duplicate.name}". Créer quand même ?` }
    }
  }

  const [client] = await withCurrentUserScope((tx) =>
    tx
      .insert(clients)
      .values({
        userId: session.user.id,
        ...parsed.data,
        defaultDailyRateCents: defaultDailyRate ? eurosToCents(Number(defaultDailyRate)) : null,
        defaultPaymentTermsDays: defaultPaymentTermsDays ? Number(defaultPaymentTermsDays) : null,
      })
      .returning(),
  )

  revalidatePath('/clients')
  redirect(`/clients/${client.id}`)
}

export async function updateClientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id'))
  const parsed = clientSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' }

  const defaultDailyRate = formData.get('defaultDailyRate')
  const defaultPaymentTermsDays = formData.get('defaultPaymentTermsDays')

  await withCurrentUserScope((tx) =>
    tx
      .update(clients)
      .set({
        ...parsed.data,
        defaultDailyRateCents: defaultDailyRate ? eurosToCents(Number(defaultDailyRate)) : null,
        defaultPaymentTermsDays: defaultPaymentTermsDays ? Number(defaultPaymentTermsDays) : null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id)),
  )

  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
  return { success: true }
}

export async function archiveClientAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(clients).set({ archivedAt: new Date() }).where(eq(clients.id, id)))
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function unarchiveClientAction(id: string): Promise<ActionResult> {
  await withCurrentUserScope((tx) => tx.update(clients).set({ archivedAt: null }).where(eq(clients.id, id)))
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

/**
 * Suppression physique autorisée UNIQUEMENT si aucun document n'existe pour
 * ce client (PROMPT.md : « jamais de suppression si des documents existent »).
 * Sinon, redirige vers l'archivage.
 */
export async function deleteClientAction(id: string): Promise<ActionResult> {
  const hasDocuments = await withCurrentUserScope(async (tx) => {
    const [quote] = await tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.clientId, id)).limit(1)
    if (quote) return true
    const [invoice] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.clientId, id)).limit(1)
    if (invoice) return true
    const [project] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.clientId, id)).limit(1)
    if (project) return true
    const [template] = await tx
      .select({ id: recurringInvoiceTemplates.id })
      .from(recurringInvoiceTemplates)
      .where(eq(recurringInvoiceTemplates.clientId, id))
      .limit(1)
    return Boolean(template)
  })

  if (hasDocuments) {
    return { error: 'Ce client a des documents associés : archive-le plutôt que de le supprimer.' }
  }

  await withCurrentUserScope((tx) => tx.delete(clients).where(eq(clients.id, id)))
  revalidatePath('/clients')
  redirect('/clients')
}
