import { notFound } from 'next/navigation'

import { FinanceShell } from '@/components/finance-shell'
import { QuoteDetailScreen } from '@/components/quotes/quote-detail-screen'
import { listClients } from '@/lib/clients/queries'
import { getQuoteWithLines } from '@/lib/quotes/queries'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [quote, clients] = await Promise.all([getQuoteWithLines(id), listClients()])
  if (!quote) notFound()

  return (
    <FinanceShell title={quote.number ?? 'DEVIS (BROUILLON)'} eyebrow={quote.client?.name ?? 'Devis'}>
      <QuoteDetailScreen quote={quote} lines={quote.lines} clients={clients} />
    </FinanceShell>
  )
}
