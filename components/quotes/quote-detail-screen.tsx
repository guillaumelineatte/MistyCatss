'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Copy, Download, Send } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import type { clients as clientsTable, quoteLines as quoteLinesTable, quotes as quotesTable } from '@/db/schema'
import {
  convertQuoteToInvoiceAction,
  deleteQuoteAction,
  duplicateQuoteAction,
  sendQuoteAction,
} from '@/lib/quotes/actions'
import { formatEuros } from '@/lib/money'
import { QuoteForm } from './quote-form'

type Client = typeof clientsTable.$inferSelect
type Quote = typeof quotesTable.$inferSelect & { client: Client | null }
type QuoteLine = typeof quoteLinesTable.$inferSelect

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
}

export function QuoteDetailScreen({ quote, lines, clients }: { quote: Quote; lines: QuoteLine[]; clients: Client[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/quotes/${quote.publicToken}` : ''

  async function handleSend() {
    setBusy(true)
    setError(null)
    const result = await sendQuoteAction(quote.id)
    setBusy(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function handleDuplicate() {
    setBusy(true)
    const result = await duplicateQuoteAction(quote.id)
    setBusy(false)
    if (result.newId) router.push(`/quotes/${result.newId}`)
    else if (result.error) setError(result.error)
  }

  async function handleConvert() {
    setBusy(true)
    setError(null)
    const result = await convertQuoteToInvoiceAction(quote.id)
    setBusy(false)
    if (result.invoiceId) router.push('/invoices')
    else if (result.error) setError(result.error)
  }

  async function handleDelete() {
    await deleteQuoteAction(quote.id)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <button onClick={() => setEditing(false)} className="self-start font-mono text-xs underline">
          ← Annuler l&apos;édition
        </button>
        <QuoteForm mode="edit" clients={clients} quote={quote} lines={lines} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Link href="/invoices" className="font-mono text-xs underline underline-offset-4">
          ← Retour aux devis & factures
        </Link>
      </div>

      <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
          <SectionLabel tone={quote.status === 'accepted' ? 'blue' : quote.status === 'refused' || quote.status === 'expired' ? 'pink' : 'ink'}>
            {statusLabels[quote.status]}
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <>
                <ButtonSecondary onClick={() => setEditing(true)}>Modifier</ButtonSecondary>
                <ButtonPrimary onClick={handleSend}>
                  <Send className="size-4" /> {busy ? '…' : 'Envoyer'}
                </ButtonPrimary>
              </>
            )}
            {quote.status === 'accepted' && (
              <ButtonPrimary onClick={handleConvert}>{busy ? '…' : 'Convertir en facture'}</ButtonPrimary>
            )}
            <ButtonSecondary onClick={handleDuplicate}>{busy ? '…' : 'Dupliquer'}</ButtonSecondary>
            <a href={`/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">
              <ButtonSecondary>
                <Download className="size-4" /> PDF
              </ButtonSecondary>
            </a>
          </div>
        </div>

        {error && <p className="mt-4 font-mono text-xs text-[var(--pink)]">{error}</p>}

        {quote.status !== 'draft' && (
          <div className="mt-4 flex items-center gap-2 font-mono text-xs">
            <span className="text-[var(--ink)]/60">Lien public :</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="flex items-center gap-1 underline"
            >
              <Copy className="size-3" /> Copier le lien
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Client</p>
            <p className="mt-1 font-bold">{quote.client?.name ?? '—'}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Émis le</p>
            <p className="mt-1 font-mono text-sm">{quote.issueDate.split('-').reverse().join('/')}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Valable jusqu&apos;au</p>
            <p className="mt-1 font-mono text-sm">{quote.validUntil ? quote.validUntil.split('-').reverse().join('/') : '—'}</p>
          </div>
        </div>

        <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
          <table className="w-full font-mono text-xs">
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
            <span>HT : {formatEuros(quote.totalHtCents)}</span>
            <span>TVA : {formatEuros(quote.totalVatCents)}</span>
            <span className="font-anton text-2xl">TTC : {formatEuros(quote.totalTtcCents)}</span>
          </div>
        </div>

        {quote.status === 'draft' && (
          <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
            <button onClick={handleDelete} className="font-mono text-xs uppercase text-[var(--pink)] underline">
              Supprimer ce brouillon
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
