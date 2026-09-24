import { FinanceShell } from '@/components/finance-shell'
import { InvoiceForm } from '@/components/invoicing/invoice-form'
import { listClients } from '@/lib/clients/queries'

export default async function NewInvoicePage() {
  const clients = await listClients()

  return (
    <FinanceShell title="NOUVELLE FACTURE" eyebrow="Devis & factures">
      <InvoiceForm mode="create" clients={clients} />
    </FinanceShell>
  )
}
