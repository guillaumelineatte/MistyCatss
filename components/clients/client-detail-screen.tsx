'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Pencil } from 'lucide-react'

import { ButtonSecondary, SectionLabel, StatCard } from '@/components/finance-shell'
import { archiveClientAction, deleteClientAction, unarchiveClientAction } from '@/lib/clients/actions'
import type { ClientIndicators } from '@/lib/clients/queries'
import { formatEuros } from '@/lib/money'
import type { clients as clientsTable, invoices as invoicesTable, quotes as quotesTable } from '@/db/schema'
import { ClientForm } from './client-form'

type Client = typeof clientsTable.$inferSelect
type Quote = typeof quotesTable.$inferSelect
type Invoice = typeof invoicesTable.$inferSelect

const quoteStatusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
}

const invoiceStatusLabels: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  sent: 'Envoyée',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}

export function ClientDetailScreen({
  client,
  indicators,
  quotes,
  invoices,
}: {
  client: Client
  indicators: ClientIndicators
  quotes: Quote[]
  invoices: Invoice[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  async function onArchiveToggle() {
    if (client.archivedAt) await unarchiveClientAction(client.id)
    else await archiveClientAction(client.id)
    router.refresh()
  }

  async function onDelete() {
    const result = await deleteClientAction(client.id)
    if (result?.error) setDeleteError(result.error)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Link href="/clients" className="font-mono text-xs underline underline-offset-4">
          ← Retour aux clients
        </Link>
      </div>

      {editing ? (
        <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
          <ClientForm mode="edit" client={client} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
            <div>
              <SectionLabel tone="blue">{client.archivedAt ? 'Archivé' : 'Client actif'}</SectionLabel>
              <h2 className="mt-5 max-w-lg text-5xl">{client.name}</h2>
              {client.contactEmail && <p className="mt-2 font-mono text-sm">{client.contactEmail}</p>}
            </div>
            <button
              aria-label="Modifier le client"
              onClick={() => setEditing(true)}
              className="border-2 border-[var(--ink)] p-3 shadow-[3px_3px_0_var(--ink)]"
            >
              <Pencil className="size-4" />
            </button>
          </div>

          <div className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="CA cumulé" value={formatEuros(indicators.totalCaCents)} note="Factures émises" tone="blue" />
            <StatCard label="Encours" value={formatEuros(indicators.outstandingCents)} note="Restant dû" />
            <StatCard
              label="Délai moyen"
              value={indicators.averagePaymentDelayDays != null ? `${indicators.averagePaymentDelayDays} j` : '—'}
              note="Entre émission et paiement"
            />
            <StatCard
              label="Part du CA"
              value={`${(indicators.shareOfTotalCaBasisPoints / 100).toLocaleString('fr-FR')} %`}
              note={indicators.isDependencyRisk ? 'Concentration élevée' : 'Du CA total'}
              tone={indicators.isDependencyRisk ? 'pink' : 'paper'}
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t-2 border-[var(--ink)] pt-5">
            <ButtonSecondary onClick={onArchiveToggle}>{client.archivedAt ? 'Réactiver' : 'Archiver'}</ButtonSecondary>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <h3 className="text-2xl">DEVIS</h3>
          <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
            {quotes.length === 0 && <p className="text-[var(--ink)]/60">Aucun devis.</p>}
            {quotes.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-3">
                <span>{quote.number ?? 'Brouillon'} · {quoteStatusLabels[quote.status]}</span>
                <span>{formatEuros(quote.totalTtcCents)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <h3 className="text-2xl">FACTURES</h3>
          <div className="mt-4 flex flex-col gap-3 font-mono text-xs">
            {invoices.length === 0 && <p className="text-[var(--ink)]/60">Aucune facture.</p>}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-3">
                <span>{invoice.fullNumber ?? 'Brouillon'} · {invoiceStatusLabels[invoice.status]}</span>
                <span>{formatEuros(invoice.totalTtcCents)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-5">
        <h3 className="text-xl">SUPPRIMER CE CLIENT</h3>
        <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">
          Possible uniquement si aucun devis, facture ou projet n&apos;y est rattaché — sinon, archive-le.
        </p>
        {deleteError && <p className="mt-2 font-mono text-xs text-[var(--pink)]">{deleteError}</p>}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="font-mono text-xs uppercase">
            Tape le nom du client pour confirmer
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="mt-2 block h-11 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 font-mono text-sm outline-none"
            />
          </label>
          <button
            onClick={onDelete}
            disabled={confirmText !== client.name}
            className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--pink)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
