import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { companies } from '@/db/schema'
import { quoteExporter } from '@/lib/documents/quote-exporter'
import { getQuoteByPublicToken } from '@/lib/quotes/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const quote = await getQuoteByPublicToken(token)
  if (!quote) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const seller = await db.query.companies.findFirst({ where: eq(companies.userId, quote.userId) })

  const buffer = await quoteExporter.export({ quote, lines: quote.lines, client: quote.client, seller: seller ?? null })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${quote.number ?? quote.id}.pdf"`,
    },
  })
}
