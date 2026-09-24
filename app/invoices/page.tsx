import { FinanceShell } from '@/components/finance-shell'
import { InvoicesOverviewScreen } from '@/components/quotes/invoices-overview-screen'
import { requireSession } from '@/lib/auth/session'
import { listInvoices } from '@/lib/invoicing/queries'
import { listQuotes } from '@/lib/quotes/queries'

export default async function InvoicesPage() {
  const session = await requireSession()
  const [quotes, invoiceRows] = await Promise.all([listQuotes(session.user.id), listInvoices(session.user.id)])

  return (
    <FinanceShell title="DEVIS & FACTURES" eyebrow={`${quotes.length} devis · ${invoiceRows.length} facture${invoiceRows.length > 1 ? 's' : ''}`}>
      <InvoicesOverviewScreen quotes={quotes} invoices={invoiceRows} />
    </FinanceShell>
  )
}
