import { NextResponse } from 'next/server'

import { requireSession } from '@/lib/auth/session'
import { buildVatPeriodsCsv } from '@/lib/vat/export'
import { listVatPeriods } from '@/lib/vat/queries'

export async function GET() {
  await requireSession()
  const periods = await listVatPeriods()
  const body = buildVatPeriodsCsv(periods)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tva-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
