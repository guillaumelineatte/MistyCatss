import { desc, eq } from 'drizzle-orm'

import { FinanceShell } from '@/components/finance-shell'
import { InvoicesOverviewScreen } from '@/components/quotes/invoices-overview-screen'
import { invoices } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { listQuotes } from '@/lib/quotes/queries'

export default async function InvoicesPage() {
  const session = await requireSession()
  const [quotes, invoiceRows] = await Promise.all([
    listQuotes(session.user.id),
    withCurrentUserScope((tx) =>
      tx.query.invoices.findMany({ where: eq(invoices.userId, session.user.id), with: { client: true }, orderBy: desc(invoices.createdAt) }),
    ),
  ])

  return (
    <FinanceShell title="DEVIS & FACTURES" eyebrow={`${quotes.length} devis · ${invoiceRows.length} facture${invoiceRows.length > 1 ? 's' : ''}`}>
      <InvoicesOverviewScreen quotes={quotes} invoices={invoiceRows} />
    </FinanceShell>
  )
}
