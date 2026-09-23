'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'

import { ButtonPrimary } from '@/components/finance-shell'
import type { clients as clientsTable } from '@/db/schema'
import { ClientForm } from './client-form'

type Client = typeof clientsTable.$inferSelect

export function ClientsListScreen({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        (client.siret ?? '').includes(q) ||
        (client.contactEmail ?? '').toLowerCase().includes(q),
    )
  }, [clients, query])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 focus-within:border-[var(--blue)] focus-within:shadow-[3px_3px_0_var(--blue)] lg:w-80">
          <Search className="size-4" />
          <input
            aria-label="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher…"
            className="w-full bg-transparent font-mono text-xs outline-none"
          />
        </div>
        <ButtonPrimary onClick={() => setCreating((v) => !v)}>
          <Plus className="size-4" /> {creating ? 'Annuler' : 'Ajouter un client'}
        </ButtonPrimary>
      </div>

      {creating && (
        <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
          <ClientForm mode="create" onDone={() => setCreating(false)} />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-10 text-center">
          <p className="font-anton text-3xl">
            {clients.length === 0 ? 'AUCUN CLIENT' : 'AUCUN RÉSULTAT'}
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">
            {clients.length === 0 ? "Ajoute ton premier client pour commencer." : 'Essaie une autre recherche.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center justify-between border-2 border-[var(--ink)] bg-[var(--paper)] p-4 shadow-[3px_3px_0_var(--ink)] transition-transform hover:-translate-y-0.5"
            >
              <div>
                <p className="font-bold">{client.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase text-[var(--ink)]/60">
                  {client.contactEmail || client.siret || 'Aucune coordonnée renseignée'}
                  {client.archivedAt && ' · Archivé'}
                </p>
              </div>
              {client.defaultDailyRateCents != null && (
                <span className="font-mono text-sm">{(client.defaultDailyRateCents / 100).toLocaleString('fr-FR')} € / j</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
