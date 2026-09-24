import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { invoices } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { buildInvoicesCsv, buildInvoicesFec } from '@/lib/invoicing/accounting-export'

export async function GET(request: Request) {
  const session = await requireSession()
  const format = new URL(request.url).searchParams.get('format') === 'fec' ? 'fec' : 'csv'

  const rows = await withCurrentUserScope((tx) =>
    tx.query.invoices.findMany({ where: eq(invoices.userId, session.user.id), with: { client: true } }),
  )

  if (format === 'fec') {
    const body = buildInvoicesFec(rows)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="FEC-${new Date().toISOString().slice(0, 10)}.txt"`,
      },
    })
  }

  const body = buildInvoicesCsv(rows)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="factures-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
