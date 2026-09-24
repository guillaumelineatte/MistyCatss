import { notFound } from 'next/navigation'

import { markInvoiceViewedAction } from '@/lib/invoicing/actions'
import { getInvoiceByPublicToken } from '@/lib/invoicing/queries'
import { PublicInvoiceScreen } from '@/components/invoicing/public-invoice-screen'

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invoice = await getInvoiceByPublicToken(token)
  if (!invoice) notFound()

  await markInvoiceViewedAction(token)

  return (
    <div className="min-h-screen bg-[var(--paper)] px-5 py-12 text-[var(--ink)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <span className="font-anton text-3xl uppercase leading-[.75] tracking-[-.04em]">
            ARGENT<span className="text-[var(--pink)]">BRUT</span>
          </span>
        </div>
        <PublicInvoiceScreen invoice={invoice} lines={invoice.lines} token={token} />
      </div>
    </div>
  )
}
