'use server'

import { and, eq, ilike } from 'drizzle-orm'

import { clients, invoices, projects, quotes } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'

export type SearchResult = { type: 'client' | 'quote' | 'invoice' | 'project'; id: string; label: string; sublabel: string; href: string }

/** Recherche globale sur toutes les entités principales — palette de commandes (Cmd+K). */
export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const session = await requireSession()
  const pattern = `%${q}%`

  return withCurrentUserScope(async (tx) => {
    const [clientRows, quoteRows, invoiceRows, projectRows] = await Promise.all([
      tx
        .select()
        .from(clients)
        .where(and(eq(clients.userId, session.user.id), ilike(clients.name, pattern)))
        .limit(5),
      tx.query.quotes.findMany({
        where: and(eq(quotes.userId, session.user.id), ilike(quotes.number, pattern)),
        with: { client: true },
        limit: 5,
      }),
      tx.query.invoices.findMany({
        where: and(eq(invoices.userId, session.user.id), ilike(invoices.fullNumber, pattern)),
        with: { client: true },
        limit: 5,
      }),
      tx
        .select()
        .from(projects)
        .where(and(eq(projects.userId, session.user.id), ilike(projects.name, pattern)))
        .limit(5),
    ])

    return [
      ...clientRows.map((c): SearchResult => ({ type: 'client', id: c.id, label: c.name, sublabel: 'Client', href: `/clients/${c.id}` })),
      ...quoteRows.map((quote): SearchResult => ({
        type: 'quote',
        id: quote.id,
        label: quote.number ?? 'Devis brouillon',
        sublabel: `Devis · ${quote.client?.name ?? ''}`,
        href: `/quotes/${quote.id}`,
      })),
      ...invoiceRows.map((invoice): SearchResult => ({
        type: 'invoice',
        id: invoice.id,
        label: invoice.fullNumber ?? 'Facture brouillon',
        sublabel: `Facture · ${invoice.client?.name ?? ''}`,
        href: `/invoices/${invoice.id}`,
      })),
      ...projectRows.map((project): SearchResult => ({ type: 'project', id: project.id, label: project.name, sublabel: 'Projet', href: '/time' })),
    ]
  })
}
