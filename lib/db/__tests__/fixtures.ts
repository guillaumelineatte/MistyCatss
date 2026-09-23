import { eq, sql } from 'drizzle-orm'

import * as schema from '@/db/schema'
import { testAdminDb, withTestUserScope } from './test-db'

/**
 * Crée une ligne dans chacune des 28 tables cloisonnées par utilisateur, pour
 * un `userId` donné. Utilisé par les tests d'isolation pour avoir de vraies
 * données à tenter de lire depuis un autre compte.
 */
export async function createFullFixtureSet(userId: string) {
  return withTestUserScope(userId, async (tx) => {
    await tx.insert(schema.companies).values({ userId, legalName: `Entreprise ${userId}` })
    await tx.insert(schema.statusPeriods).values({
      userId,
      status: 'micro',
      vatRegime: 'franchise',
      startDate: '2024-01-01',
    })
    await tx.insert(schema.fiscalParamOverrides).values({
      userId,
      year: 2026,
      status: 'micro',
      paramKey: 'cotisation_rate',
      value: '24.6',
    })
    await tx.insert(schema.userPreferences).values({ userId })

    const [series] = await tx
      .insert(schema.numberingSeries)
      .values({ userId, kind: 'invoice', prefix: 'F' })
      .returning()
    await tx.insert(schema.documentNumberCounters).values({ seriesId: series.id, scopeYear: 2026, lastNumber: 1 })

    await tx.insert(schema.emailTemplates).values({ userId, kind: 'invoice_send', subject: 'S', bodyHtml: 'B' })

    const [client] = await tx.insert(schema.clients).values({ userId, name: `Client ${userId}` }).returning()

    const [quote] = await tx
      .insert(schema.quotes)
      .values({ userId, clientId: client.id, issueDate: '2026-01-01' })
      .returning()
    await tx.insert(schema.quoteLines).values({
      quoteId: quote.id,
      position: 1,
      description: 'Ligne',
      quantity: '1',
      unitPriceCents: 1000,
      vatRateBasisPoints: 2000,
      lineTotalHtCents: 1000,
    })

    const [invoice] = await tx
      .insert(schema.invoices)
      .values({ userId, clientId: client.id, issueDate: '2026-01-01' })
      .returning()
    await tx.insert(schema.invoiceLines).values({
      invoiceId: invoice.id,
      position: 1,
      description: 'Ligne',
      quantity: '1',
      unitPriceCents: 1000,
      vatRateBasisPoints: 2000,
      lineTotalHtCents: 1000,
    })
    await tx.insert(schema.invoiceAuditLog).values({ invoiceId: invoice.id, event: 'created', actorUserId: userId })
    await tx.insert(schema.invoiceReminders).values({ invoiceId: invoice.id })

    const [bankAccount] = await tx.insert(schema.bankAccounts).values({ userId, name: 'Compte' }).returning()
    const [transaction] = await tx
      .insert(schema.transactions)
      .values({ userId, bankAccountId: bankAccount.id, date: '2026-01-01', label: 'Virement', amountCents: 1000 })
      .returning()
    await tx.insert(schema.invoicePayments).values({
      invoiceId: invoice.id,
      transactionId: transaction.id,
      amountCents: 1000,
      paidAt: '2026-01-01',
    })

    const [category] = await tx
      .insert(schema.transactionCategories)
      .values({ userId, name: 'Cat', kind: 'income' })
      .returning()
    await tx.insert(schema.categoryRules).values({ userId, matchPattern: 'virement', categoryId: category.id })

    await tx.insert(schema.deadlines).values({ userId, kind: 'tva', dueDate: '2026-03-15' })
    await tx.insert(schema.vatPeriods).values({ userId, periodStart: '2026-01-01', periodEnd: '2026-01-31' })

    const [project] = await tx
      .insert(schema.projects)
      .values({ userId, clientId: client.id, name: 'Projet' })
      .returning()
    await tx
      .insert(schema.timeEntries)
      .values({ userId, projectId: project.id, date: '2026-01-01', durationMinutes: 60 })
    await tx.insert(schema.activeTimers).values({ userId, projectId: project.id })

    await tx
      .insert(schema.files)
      .values({ userId, kind: 'receipt', originalName: 'f.pdf', storedPath: 'x', mimeType: 'application/pdf', sizeBytes: 1 })
    await tx.insert(schema.dataExportRequests).values({ userId })

    const [template] = await tx
      .insert(schema.recurringInvoiceTemplates)
      .values({ userId, clientId: client.id, label: 'Mensuel', periodicity: 'monthly', nextRunDate: '2026-02-01' })
      .returning()
    await tx.insert(schema.recurringInvoiceTemplateLines).values({
      templateId: template.id,
      position: 1,
      description: 'Ligne',
      quantity: '1',
      unitPriceCents: 1000,
      vatRateBasisPoints: 2000,
    })

    return { client, quote, invoice, series, bankAccount, transaction, category, project, template }
  })
}

/**
 * Défait un jeu de fixtures créé par createFullFixtureSet, dans l'ordre de
 * dépendance. Ne PAS remplacer par un simple `DELETE FROM "user"` : plusieurs
 * FK sont volontairement en `RESTRICT` (numbering_series<-invoices,
 * clients<-quotes/invoices/projects/recurring_templates,
 * invoices<-invoice_payments) pour qu'un compte avec de l'historique
 * financier ne puisse jamais disparaître par un simple cascade — exactement
 * le comportement voulu en usage réel (voir décision Phase 3, CLAUDE.md sur
 * suppression de compte vs. conservation légale des factures). Une vraie
 * suppression/anonymisation de compte (Phase 6+) devra faire un nettoyage
 * tout aussi explicite, pas compter sur ON DELETE CASCADE.
 */
export async function deleteFullFixtureSet(userId: string) {
  await testAdminDb.execute(
    sql`ALTER TABLE "invoice_audit_log" DISABLE TRIGGER "invoice_audit_log_append_only"`,
  )
  await testAdminDb.execute(
    sql`ALTER TABLE "invoice_lines" DISABLE TRIGGER "invoice_lines_immutable_once_issued"`,
  )

  await testAdminDb
    .delete(schema.invoicePayments)
    .where(sql`invoice_id IN (SELECT id FROM invoices WHERE user_id = ${userId})`)
  await testAdminDb
    .delete(schema.invoiceReminders)
    .where(sql`invoice_id IN (SELECT id FROM invoices WHERE user_id = ${userId})`)
  await testAdminDb
    .delete(schema.invoiceAuditLog)
    .where(sql`invoice_id IN (SELECT id FROM invoices WHERE user_id = ${userId})`)
  await testAdminDb
    .delete(schema.invoiceLines)
    .where(sql`invoice_id IN (SELECT id FROM invoices WHERE user_id = ${userId})`)
  await testAdminDb.delete(schema.invoices).where(eq(schema.invoices.userId, userId))

  await testAdminDb
    .delete(schema.quoteLines)
    .where(sql`quote_id IN (SELECT id FROM quotes WHERE user_id = ${userId})`)
  await testAdminDb.delete(schema.quotes).where(eq(schema.quotes.userId, userId))

  await testAdminDb
    .delete(schema.recurringInvoiceTemplateLines)
    .where(sql`template_id IN (SELECT id FROM recurring_invoice_templates WHERE user_id = ${userId})`)
  await testAdminDb.delete(schema.recurringInvoiceTemplates).where(eq(schema.recurringInvoiceTemplates.userId, userId))

  await testAdminDb.delete(schema.timeEntries).where(eq(schema.timeEntries.userId, userId))
  await testAdminDb.delete(schema.activeTimers).where(eq(schema.activeTimers.userId, userId))
  await testAdminDb.delete(schema.projects).where(eq(schema.projects.userId, userId))

  await testAdminDb
    .delete(schema.documentNumberCounters)
    .where(sql`series_id IN (SELECT id FROM numbering_series WHERE user_id = ${userId})`)
  await testAdminDb.delete(schema.numberingSeries).where(eq(schema.numberingSeries.userId, userId))

  await testAdminDb.delete(schema.categoryRules).where(eq(schema.categoryRules.userId, userId))
  await testAdminDb.delete(schema.transactions).where(eq(schema.transactions.userId, userId))
  await testAdminDb.delete(schema.transactionCategories).where(eq(schema.transactionCategories.userId, userId))
  await testAdminDb.delete(schema.bankAccounts).where(eq(schema.bankAccounts.userId, userId))

  await testAdminDb.delete(schema.deadlines).where(eq(schema.deadlines.userId, userId))
  await testAdminDb.delete(schema.vatPeriods).where(eq(schema.vatPeriods.userId, userId))

  await testAdminDb.delete(schema.clients).where(eq(schema.clients.userId, userId))

  await testAdminDb.execute(sql`ALTER TABLE "invoice_lines" ENABLE TRIGGER "invoice_lines_immutable_once_issued"`)
  await testAdminDb.execute(sql`ALTER TABLE "invoice_audit_log" ENABLE TRIGGER "invoice_audit_log_append_only"`)

  // Le reste n'a que des FK en cascade directe vers user.id : la suppression
  // de l'utilisateur (faite par l'appelant) les nettoie sans souci.
}

export const SCOPED_TABLES = [
  'companies',
  'status_periods',
  'fiscal_param_overrides',
  'user_preferences',
  'numbering_series',
  'document_number_counters',
  'email_templates',
  'clients',
  'quotes',
  'quote_lines',
  'invoices',
  'invoice_lines',
  'invoice_audit_log',
  'invoice_reminders',
  'bank_accounts',
  'transactions',
  'transaction_categories',
  'category_rules',
  'invoice_payments',
  'deadlines',
  'vat_periods',
  'projects',
  'time_entries',
  'active_timers',
  'files',
  'data_export_requests',
  'recurring_invoice_templates',
  'recurring_invoice_template_lines',
] as const
