import { FinanceShell } from '@/components/finance-shell'
import { QuoteForm } from '@/components/quotes/quote-form'
import { listClients } from '@/lib/clients/queries'

export default async function NewQuotePage() {
  const clients = await listClients()

  return (
    <FinanceShell title="NOUVEAU DEVIS" eyebrow="Devis & factures">
      <QuoteForm mode="create" clients={clients} />
    </FinanceShell>
  )
}
