'use client'

import { useActionState } from 'react'
import { Download } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import type { clients as clientsTable, quoteLines as quoteLinesTable, quotes as quotesTable } from '@/db/schema'
import { respondToPublicQuoteAction, type ActionResult } from '@/lib/quotes/actions'
import { formatEuros } from '@/lib/money'

type Quote = typeof quotesTable.$inferSelect & { client: typeof clientsTable.$inferSelect | null }
type QuoteLine = typeof quoteLinesTable.$inferSelect

const initialState: ActionResult = {}

export function PublicQuoteScreen({ quote, lines, token }: { quote: Quote; lines: QuoteLine[]; token: string }) {
  const [state, formAction, pending] = useActionState(respondToPublicQuoteAction, initialState)
  const resolvedStatus = state.success ? undefined : quote.status

  return (
    <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)] md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div>
          <p className="font-mono text-xs uppercase text-[var(--ink)]/60">Devis {quote.number}</p>
          <h1 className="mt-2 text-4xl">{quote.client?.name}</h1>
        </div>
        <a href={`/public/quotes/${token}/pdf`} target="_blank" rel="noreferrer">
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
        <span>HT : {formatEuros(quote.totalHtCents)}</span>
        <span>TVA : {formatEuros(quote.totalVatCents)}</span>
        <span className="font-anton text-2xl">TTC : {formatEuros(quote.totalTtcCents)}</span>
      </div>

      {quote.notes && <p className="mt-6 border-t-2 border-[var(--ink)] pt-4 font-mono text-xs">{quote.notes}</p>}

      <div className="mt-8 border-t-2 border-[var(--ink)] pt-6">
        {resolvedStatus === 'sent' ? (
          <form action={formAction} className="flex flex-wrap gap-3">
            <input type="hidden" name="token" value={token} />
            {state.error && <p className="w-full font-mono text-xs text-[var(--pink)]">{state.error}</p>}
            <button
              name="decision"
              value="accepted"
              disabled={pending}
              className="flex h-12 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-5 font-anton uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--ink)]"
            >
              Accepter le devis
            </button>
            <button
              name="decision"
              value="refused"
              disabled={pending}
              className="flex h-12 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-5 font-anton uppercase shadow-[4px_4px_0_var(--ink)]"
            >
              Refuser
            </button>
          </form>
        ) : (
          <p className="font-mono text-sm">
            {state.success
              ? 'Merci, ta réponse a bien été enregistrée.'
              : quote.status === 'accepted'
                ? 'Ce devis a été accepté.'
                : quote.status === 'refused'
                  ? 'Ce devis a été refusé.'
                  : quote.status === 'expired'
                    ? 'Ce devis a expiré.'
                    : 'Ce devis est encore en préparation.'}
          </p>
        )}
      </div>
    </div>
  )
}
