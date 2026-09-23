import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db/client'
import { companies, statusPeriods, userPreferences } from '@/db/schema'
import { getSession } from '@/lib/auth/session'

// Export RGPD des données du compte. Couvre pour l'instant profil + entreprise
// + statuts + préférences : s'étendra au fil des phases à mesure que clients,
// devis, factures, etc. arrivent en base (voir Conformité dans PROMPT.md).
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const [company, periods, preferences] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.userId, userId) }),
    db.query.statusPeriods.findMany({ where: eq(statusPeriods.userId, userId) }),
    db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
    },
    company: company ?? null,
    statusPeriods: periods,
    preferences: preferences ?? null,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="argent-brut-export.json"',
    },
  })
}
