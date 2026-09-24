'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SectionLabel } from '@/components/finance-shell'
import type { clients as clientsTable, quotes as quotesTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { setQuoteWinProbabilityAction } from '@/lib/quotes/actions'

type Quote = typeof quotesTable.$inferSelect & { client?: typeof clientsTable.$inferSelect | null }

export function PipelineCard({ quotes, weightedCents, unweightedCents }: { quotes: Quote[]; weightedCents: number; unweightedCents: number }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  async function onSave(id: string) {
    const value = draft.trim() === '' ? null : Number(draft)
    const result = await setQuoteWinProbabilityAction(id, value)
    if (result.error) {
      alert(result.error)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex items-center gap-3">
        <SectionLabel tone="pink">Pipeline</SectionLabel>
        <h2 className="text-3xl">DEVIS EN ATTENTE</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Total pondéré</p>
          <p className="font-anton text-4xl">{formatEuros(weightedCents)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Total brut</p>
          <p className="font-anton text-4xl text-[var(--ink)]/50">{formatEuros(unweightedCents)}</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucun devis envoyé en attente.</p>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-xs">
          {quotes.map((quote) => (
            <div key={quote.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--ink)]/30 pb-3">
              <span className="flex-1">
                {quote.number ?? 'Brouillon'} · {quote.client?.name}
              </span>
              <span>{formatEuros(quote.totalTtcCents)}</span>
              {editingId === quote.id ? (
                <>
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="%"
                    className="h-8 w-20 border-2 border-[var(--ink)] bg-[var(--paper)] px-2"
                  />
                  <button className="underline" onClick={() => onSave(quote.id)}>
                    OK
                  </button>
                </>
              ) : (
                <button
                  className="border border-[var(--ink)] px-2 py-0.5"
                  onClick={() => {
                    setEditingId(quote.id)
                    setDraft(quote.winProbabilityBasisPoints != null ? String(quote.winProbabilityBasisPoints / 100) : '')
                  }}
                >
                  {quote.winProbabilityBasisPoints != null ? `${quote.winProbabilityBasisPoints / 100} %` : 'Non pondéré'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
