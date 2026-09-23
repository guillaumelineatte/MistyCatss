import { desc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

import { FinanceShell } from '@/components/finance-shell'
import { ClientDetailScreen } from '@/components/clients/client-detail-screen'
import { invoices, quotes } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'
import { getClient, getClientIndicators } from '@/lib/clients/queries'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const [indicators, clientQuotes, clientInvoices] = await Promise.all([
    getClientIndicators(id),
    withCurrentUserScope((tx) => tx.select().from(quotes).where(eq(quotes.clientId, id)).orderBy(desc(quotes.issueDate))),
    withCurrentUserScope((tx) => tx.select().from(invoices).where(eq(invoices.clientId, id)).orderBy(desc(invoices.createdAt))),
  ])

  return (
    <FinanceShell title={client.name.toUpperCase()} eyebrow="Fiche client">
      <ClientDetailScreen client={client} indicators={indicators} quotes={clientQuotes} invoices={clientInvoices} />
    </FinanceShell>
  )
}
