import { FinanceShell } from '@/components/finance-shell'
import { ClientsListScreen } from '@/components/clients/clients-list-screen'
import { listClients } from '@/lib/clients/queries'

export default async function ClientsPage() {
  const clients = await listClients()

  return (
    <FinanceShell title="CLIENTS" eyebrow={`${clients.length} relation${clients.length > 1 ? 's' : ''}`}>
      <ClientsListScreen clients={clients} />
    </FinanceShell>
  )
}
