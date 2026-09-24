'use client'

import Link from 'next/link'
import { Download, Plus } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, StatCard } from '@/components/finance-shell'
import type { clients as clientsTable, invoices as invoicesTable, quotes as quotesTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'

type Client = typeof clientsTable.$inferSelect
type Quote = typeof quotesTable.$inferSelect
type Invoice = typeof invoicesTable.$inferSelect & { client: Client | null }

const quoteStatusLabels: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Brouillon', tone: 'text-[var(--ink)]/60' },
  sent: { label: 'Envoyé', tone: 'text-[var(--blue)]' },
  accepted: { label: 'Accepté', tone: 'text-[var(--blue)]' },
  refused: { label: 'Refusé', tone: 'text-[var(--pink)]' },
  expired: { label: 'Expiré', tone: 'text-[var(--pink)]' },
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

export function InvoicesOverviewScreen({ quotes, invoices }: { quotes: Quote[]; invoices: Invoice[] }) {
  const openQuotesTtc = quotes.filter((q) => q.status === 'sent').reduce((sum, q) => sum + q.totalTtcCents, 0)
  // Les avoirs (type credit_note) réduisent l'encours, ils ne s'y ajoutent jamais.
  const outstandingTtc = invoices
    .filter((i) => i.type !== 'credit_note')
    .reduce((sum, i) => sum + (i.totalTtcCents - i.paidAmountCents), 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Devis en attente" value={formatEuros(openQuotesTtc)} note={`${quotes.filter((q) => q.status === 'sent').length} devis envoyés`} tone="blue" />
        <StatCard label="Encours factures" value={formatEuros(outstandingTtc)} note={`${invoices.length} facture(s)`} />
        <StatCard label="Devis acceptés" value={String(quotes.filter((q) => q.status === 'accepted').length)} note="Prêts à convertir" tone="pink" />
      </div>

      <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl">DEVIS</h2>
          <Link href="/quotes/new">
            <ButtonPrimary>
              <Plus className="size-4" /> Nouveau devis
            </ButtonPrimary>
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="font-mono text-xs text-[var(--ink)]/60">Aucun devis pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-2 font-mono text-xs">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="flex items-center justify-between border-b border-[var(--ink)]/30 py-3 hover:bg-[var(--blue)]/10"
              >
                <span className="font-bold">{quote.number ?? 'Brouillon'}</span>
                <span className={quoteStatusLabels[quote.status].tone}>{quoteStatusLabels[quote.status].label}</span>
                <span>{quote.issueDate.split('-').reverse().join('/')}</span>
                <span className="font-bold">{formatEuros(quote.totalTtcCents)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl">FACTURES</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/invoices/new">
              <ButtonPrimary>
                <Plus className="size-4" /> Nouvelle facture
              </ButtonPrimary>
            </Link>
            <Link href="/invoices/recurring">
              <ButtonSecondary>Facturation récurrente</ButtonSecondary>
            </Link>
            {/* Téléchargements de fichier, pas des navigations de page : <a> natifs volontaires. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/invoices/export?format=csv">
              <ButtonSecondary>
                <Download className="size-4" /> CSV
              </ButtonSecondary>
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/invoices/export?format=fec">
              <ButtonSecondary>
                <Download className="size-4" /> FEC
              </ButtonSecondary>
            </a>
          </div>
        </div>
        {invoices.length === 0 ? (
          <p className="font-mono text-xs text-[var(--ink)]/60">
            Aucune facture pour l&apos;instant. Crée-la directement, ou convertis un devis accepté.
          </p>
        ) : (
          <div className="flex flex-col gap-2 font-mono text-xs">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center justify-between border-b border-[var(--ink)]/30 py-3 hover:bg-[var(--blue)]/10"
              >
                <span className="font-bold">{invoice.fullNumber ?? 'Brouillon'}</span>
                <span>{invoice.client?.name}</span>
                <span className={invoice.status === 'overdue' ? 'text-[var(--pink)]' : ''}>
                  {invoice.type === 'credit_note' ? 'Avoir' : invoiceStatusLabels[invoice.status]}
                </span>
                <span className="font-bold">{formatEuros(invoice.totalTtcCents)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
