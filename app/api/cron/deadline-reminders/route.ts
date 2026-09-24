import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { deadlines, user } from '@/db/schema'
import { verifyCronRequest } from '@/lib/cron/verify'
import { sendEmail } from '@/lib/email'
import { deadlineReminderEmail } from '@/lib/email/templates'
import { formatEuros } from '@/lib/money'

const REMINDER_WINDOW_DAYS = 7

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Envoie un rappel (une seule fois par échéance, `reminder_sent_at` comme
 * garde d'idempotence) pour toute échéance en attente dont la date tombe
 * dans les `REMINDER_WINDOW_DAYS` prochains jours. Contrairement aux
 * relances de factures (manuelles, PROMPT.md), rien n'interdit
 * l'automatisation des rappels d'échéances fiscales.
 */
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const horizon = addDays(today, REMINDER_WINDOW_DAYS)

  const dueDeadlines = await db
    .select({ deadline: deadlines, userEmail: user.email })
    .from(deadlines)
    .innerJoin(user, eq(deadlines.userId, user.id))
    .where(and(eq(deadlines.status, 'pending'), isNull(deadlines.reminderSentAt), gte(deadlines.dueDate, today), lte(deadlines.dueDate, horizon)))

  let sent = 0
  for (const row of dueDeadlines) {
    const { subject, html } = deadlineReminderEmail(
      row.deadline.kind,
      row.deadline.dueDate,
      row.deadline.amountEstimateCents != null ? formatEuros(row.deadline.amountEstimateCents) : null,
    )
    await sendEmail({ to: row.userEmail, subject, html })
    await db.update(deadlines).set({ reminderSentAt: new Date() }).where(eq(deadlines.id, row.deadline.id))
    sent += 1
  }

  return NextResponse.json({ sent })
}
