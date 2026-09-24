import { NextResponse } from 'next/server'

import { verifyCronRequest } from '@/lib/cron/verify'
import { generateDueRecurringInvoices } from '@/lib/recurring/actions'

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const result = await generateDueRecurringInvoices(today)
  return NextResponse.json(result)
}
