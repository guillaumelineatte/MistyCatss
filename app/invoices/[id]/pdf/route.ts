import { NextResponse } from 'next/server'

import { invoiceExporter } from '@/lib/documents/invoice-exporter'
import { getInvoiceWithLines } from '@/lib/invoicing/queries'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoiceWithLines(id)
  if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const buffer = await invoiceExporter.export({ invoice, lines: invoice.lines, client: invoice.client })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="facture-${invoice.fullNumber ?? invoice.id}.pdf"`,
    },
  })
}
