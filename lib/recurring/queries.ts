import 'server-only'

import { asc, eq } from 'drizzle-orm'

import { recurringInvoiceTemplateLines, recurringInvoiceTemplates } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

export async function listRecurringTemplates() {
  return withCurrentUserScope((tx) =>
    tx.query.recurringInvoiceTemplates.findMany({ with: { client: true }, orderBy: asc(recurringInvoiceTemplates.nextRunDate) }),
  )
}

export async function getRecurringTemplateWithLines(id: string) {
  return withCurrentUserScope(async (tx) => {
    const template = await tx.query.recurringInvoiceTemplates.findFirst({ where: eq(recurringInvoiceTemplates.id, id), with: { client: true } })
    if (!template) return null
    const lines = await tx
      .select()
      .from(recurringInvoiceTemplateLines)
      .where(eq(recurringInvoiceTemplateLines.templateId, id))
      .orderBy(asc(recurringInvoiceTemplateLines.position))
    return { ...template, lines }
  })
}
