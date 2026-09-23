import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { companies } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { quoteExporter } from '@/lib/documents/quote-exporter'
import { getQuoteWithLines } from '@/lib/quotes/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()

  const quote = await getQuoteWithLines(id)
  if (!quote) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const seller = await withCurrentUserScope((tx) => tx.query.companies.findFirst({ where: eq(companies.userId, session.user.id) }))

  const buffer = await quoteExporter.export({ quote, lines: quote.lines, client: quote.client, seller: seller ?? null })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${quote.number ?? quote.id}.pdf"`,
    },
  })
}
