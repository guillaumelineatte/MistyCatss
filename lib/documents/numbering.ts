import 'server-only'

import { and, eq, sql } from 'drizzle-orm'

import { documentNumberCounters, numberingSeries } from '@/db/schema'
import type { Transaction } from '@/lib/db/scope'

const DEFAULT_PREFIX: Record<'invoice' | 'credit_note' | 'quote', string> = {
  invoice: 'F',
  credit_note: 'A',
  quote: 'D',
}

/** Récupère la série de numérotation active, ou en crée une par défaut si l'utilisateur n'en a pas encore configuré. */
export async function getOrCreateSeries(tx: Transaction, userId: string, kind: 'invoice' | 'credit_note' | 'quote') {
  const existing = await tx.query.numberingSeries.findFirst({
    where: and(eq(numberingSeries.userId, userId), eq(numberingSeries.kind, kind)),
  })
  if (existing) return existing

  const [created] = await tx
    .insert(numberingSeries)
    .values({ userId, kind, prefix: DEFAULT_PREFIX[kind], yearlyReset: true, paddingLength: 3 })
    .returning()
  return created
}

/**
 * Incrémente atomiquement le compteur d'une série pour une année donnée et
 * renvoie le nouveau numéro. `INSERT ... ON CONFLICT DO UPDATE SET n = n + 1`
 * est atomique sous Postgres : deux appels concurrents sur la même série ne
 * peuvent jamais renvoyer le même numéro (voir test de concurrence Phase 6
 * pour les factures, qui réutilise cette même fonction).
 */
export async function getNextDocumentNumber(tx: Transaction, seriesId: string, scopeYear: number): Promise<number> {
  const [row] = await tx
    .insert(documentNumberCounters)
    .values({ seriesId, scopeYear, lastNumber: 1 })
    .onConflictDoUpdate({
      target: [documentNumberCounters.seriesId, documentNumberCounters.scopeYear],
      set: { lastNumber: sql`${documentNumberCounters.lastNumber} + 1` },
    })
    .returning()
  return row.lastNumber
}

export function formatDocumentNumber(prefix: string, paddingLength: number, yearlyReset: boolean, year: number, number: number): string {
  const padded = String(number).padStart(paddingLength, '0')
  return yearlyReset ? `${prefix}${year}-${padded}` : `${prefix}${padded}`
}
