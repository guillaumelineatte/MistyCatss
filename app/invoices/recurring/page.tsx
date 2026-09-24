import { FinanceShell } from '@/components/finance-shell'
import { RecurringTemplatesScreen } from '@/components/invoicing/recurring-templates-screen'
import { listClients } from '@/lib/clients/queries'
import { listRecurringTemplates } from '@/lib/recurring/queries'

export default async function RecurringInvoicesPage() {
  const [templates, clients] = await Promise.all([listRecurringTemplates(), listClients()])

  return (
    <FinanceShell title="FACTURATION RÉCURRENTE" eyebrow={`${templates.length} modèle(s)`}>
      <RecurringTemplatesScreen templates={templates} clients={clients} />
    </FinanceShell>
  )
}
