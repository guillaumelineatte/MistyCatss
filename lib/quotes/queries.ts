import 'server-only'

import { and, asc, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db/client'
import { quoteLines, quotes } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'

/**
 * Expire à la lecture les devis "sent" dont la date de validité est dépassée
 * — en attendant la tâche planifiée réelle (Phase 10), c'est le seul point
 * d'entrée qui liste les devis, donc aucun devis expiré ne reste affiché
 * comme "envoyé" indéfiniment.
 */
async function expireOverdueQuotes(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  await withCurrentUserScope((tx) =>
    tx
      .update(quotes)
      .set({ status: 'expired' })
      .where(and(eq(quotes.userId, userId), eq(quotes.status, 'sent'), lt(quotes.validUntil, today))),
  )
}

export async function listQuotes(userId: string) {
  await expireOverdueQuotes(userId)
  return withCurrentUserScope((tx) => tx.select().from(quotes).where(eq(quotes.userId, userId)).orderBy(desc(quotes.issueDate)))
}

/**
 * Lecture PUBLIQUE par jeton (page de consultation sans authentification) :
 * utilise volontairement la connexion admin (pas de session = pas de scope
 * possible), le jeton non devinable jouant le rôle de clé d'accès.
 */
export async function getQuoteByPublicToken(token: string) {
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.publicToken, token), with: { client: true } })
  if (!quote) return null
  const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quote.id)).orderBy(asc(quoteLines.position))
  return { ...quote, lines }
}

export async function getQuoteWithLines(id: string) {
  return withCurrentUserScope(async (tx) => {
    const quote = await tx.query.quotes.findFirst({ where: eq(quotes.id, id), with: { client: true } })
    if (!quote) return null
    const lines = await tx.select().from(quoteLines).where(eq(quoteLines.quoteId, id)).orderBy(asc(quoteLines.position))
    return { ...quote, lines }
  })
}
