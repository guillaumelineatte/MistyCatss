import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { FinanceShell } from '@/components/finance-shell'
import { InvoiceDetailScreen } from '@/components/invoicing/invoice-detail-screen'
import { invoicePayments, invoiceReminders, invoiceAuditLog as invoiceAuditLogTable } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'
import { getInvoiceWithLines } from '@/lib/invoicing/queries'
import { listClients } from '@/lib/clients/queries'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [invoice, clients, payments, reminders, auditLog] = await Promise.all([
    getInvoiceWithLines(id),
    listClients(),
    withCurrentUserScope((tx) => tx.select().from(invoicePayments).where(eq(invoicePayments.invoiceId, id))),
    withCurrentUserScope((tx) => tx.select().from(invoiceReminders).where(eq(invoiceReminders.invoiceId, id))),
    withCurrentUserScope((tx) => tx.select().from(invoiceAuditLogTable).where(eq(invoiceAuditLogTable.invoiceId, id))),
  ])
  if (!invoice) notFound()

  return (
    <FinanceShell title={invoice.fullNumber ?? 'FACTURE (BROUILLON)'} eyebrow={invoice.client?.name ?? 'Facture'}>
      <InvoiceDetailScreen invoice={invoice} lines={invoice.lines} clients={clients} payments={payments} reminders={reminders} auditLog={auditLog} />
    </FinanceShell>
  )
}
