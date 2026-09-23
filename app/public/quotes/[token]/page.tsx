import { notFound } from 'next/navigation'

import { PublicQuoteScreen } from '@/components/quotes/public-quote-screen'
import { getQuoteByPublicToken } from '@/lib/quotes/queries'

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const quote = await getQuoteByPublicToken(token)
  if (!quote) notFound()

  return (
    <div className="min-h-screen bg-[var(--paper)] px-5 py-12 text-[var(--ink)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-anton text-3xl uppercase leading-[.75] tracking-[-.04em]">
            ARGENT<span className="text-[var(--pink)]">BRUT</span>
          </span>
        </div>
        <PublicQuoteScreen quote={quote} lines={quote.lines} token={token} />
      </div>
    </div>
  )
}
