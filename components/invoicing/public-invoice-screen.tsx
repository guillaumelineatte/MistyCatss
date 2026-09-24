import { Download } from 'lucide-react'

import { ButtonSecondary } from '@/components/finance-shell'
import type { clients as clientsTable, invoiceLines as invoiceLinesTable, invoices as invoicesTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'

type Invoice = typeof invoicesTable.$inferSelect & { client: typeof clientsTable.$inferSelect | null }
type InvoiceLine = typeof invoiceLinesTable.$inferSelect

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

export function PublicInvoiceScreen({ invoice, lines, token }: { invoice: Invoice; lines: InvoiceLine[]; token: string }) {
  const isCredit = invoice.type === 'credit_note'
  const dueCents = invoice.totalTtcCents - invoice.paidAmountCents

  return (
    <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div>
          <p className="font-mono text-xs uppercase text-[var(--ink)]/60">
            {isCredit ? 'Avoir' : 'Facture'} {invoice.fullNumber}
          </p>
          <h1 className="mt-2 text-4xl">{invoice.client?.name}</h1>
          <p className="mt-2 font-mono text-xs">{statusLabels[invoice.status]}</p>
        </div>
        <a href={`/public/invoices/${token}/pdf`} target="_blank" rel="noreferrer">
          <ButtonSecondary>
            <Download className="size-4" /> Télécharger le PDF
          </ButtonSecondary>
        </a>
      </div>

      <table className="mt-6 w-full font-mono text-xs">
        <thead>
          <tr className="border-b-2 border-[var(--ink)] text-left uppercase">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2 text-right">PU HT</th>
            <th className="py-2 text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-[var(--ink)]/30">
              <td className="py-2">{line.description}</td>
              <td className="py-2 text-right">{line.quantity}</td>
              <td className="py-2 text-right">{formatEuros(line.unitPriceCents)}</td>
              <td className="py-2 text-right">{formatEuros(line.lineTotalHtCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col items-end gap-1 font-mono text-sm">
        <span>HT : {formatEuros(invoice.totalHtCents)}</span>
        <span>TVA : {formatEuros(invoice.totalVatCents)}</span>
        <span className="font-anton text-2xl">TTC : {formatEuros(invoice.totalTtcCents)}</span>
        {!isCredit && invoice.paidAmountCents > 0 && (
          <span className="text-[var(--blue)]">Déjà réglé : {formatEuros(invoice.paidAmountCents)}</span>
        )}
        {!isCredit && dueCents > 0 && invoice.status !== 'paid' && (
          <span className="text-[var(--pink)]">Solde restant dû : {formatEuros(dueCents)}</span>
        )}
      </div>
    </div>
  )
}
