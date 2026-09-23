import { config } from 'dotenv'

config({ path: '.env.local' })

import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq, sql } from 'drizzle-orm'

import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

// Convertit un montant en euros entiers (comme l'ancien lib/mock-data.ts) en
// centimes entiers, seule unité monétaire admise en base.
const c = (euros: number) => Math.round(euros * 100)

const SEED_USER_ID = 'seed-user-1'
const SEED_EMAIL = 'alex@brut.dev'

async function main() {
  console.log(`Seed de développement — utilisateur ${SEED_EMAIL} (${SEED_USER_ID})`)

  // Idempotent : on nettoie uniquement les données de CET utilisateur de seed
  // avant de les réinsérer (ne touche jamais un compte réel créé via signup).
  // Les triggers d'immuabilité des factures émises sont désactivés le temps
  // du nettoyage (seed uniquement — restent actifs pour l'application).
  const invoiceTriggers = [
    ['invoices', 'invoices_immutable_once_issued'],
    ['invoices', 'invoices_no_delete_once_issued'],
    ['invoice_lines', 'invoice_lines_immutable_once_issued'],
    ['invoice_audit_log', 'invoice_audit_log_append_only'],
  ] as const
  for (const [table, trigger] of invoiceTriggers) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" DISABLE TRIGGER "${trigger}"`))
  }
  await db.delete(schema.user).where(eq(schema.user.id, SEED_USER_ID))
  for (const [table, trigger] of invoiceTriggers) {
    await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE TRIGGER "${trigger}"`))
  }

  await db.insert(schema.user).values({
    id: SEED_USER_ID,
    name: 'Alex Martin',
    email: SEED_EMAIL,
    emailVerified: true,
  })

  await db.insert(schema.companies).values({
    userId: SEED_USER_ID,
    legalName: 'Alex Martin · Développeur web',
    siret: '123 456 789 00012',
    addressLine1: '12 rue des Fondeurs',
    postalCode: '69003',
    city: 'Lyon',
    country: 'FR',
    email: SEED_EMAIL,
  })

  await db.insert(schema.statusPeriods).values({
    userId: SEED_USER_ID,
    status: 'micro',
    vatRegime: 'franchise',
    startDate: '2023-01-01',
    endDate: null,
  })

  await db.insert(schema.userPreferences).values({
    userId: SEED_USER_ID,
    defaultDailyRateCents: c(550),
    defaultPaymentTermsDays: 30,
  })

  const [invoiceSeries] = await db
    .insert(schema.numberingSeries)
    .values({ userId: SEED_USER_ID, kind: 'invoice', prefix: 'F', yearlyReset: true, paddingLength: 3 })
    .returning()
  const [quoteSeries] = await db
    .insert(schema.numberingSeries)
    .values({ userId: SEED_USER_ID, kind: 'quote', prefix: 'D', yearlyReset: true, paddingLength: 3 })
    .returning()

  const clientsData = [
    { key: 1, name: 'Agence Digitale Nord', tjm: 550 },
    { key: 2, name: 'Studio Créatif Marseille', tjm: 500 },
    { key: 3, name: 'E-Commerce Plus', tjm: 600 },
    { key: 4, name: 'SaaS Innovant', tjm: 650 },
    { key: 5, name: 'Cabinet Conseil Lyon', tjm: 500 },
    { key: 6, name: 'Startup Web3', tjm: 550 },
    { key: 7, name: 'Boutique Mode Online', tjm: 450 },
    { key: 8, name: 'Média Indépendant', tjm: 500 },
    { key: 9, name: 'Auto-école Digital', tjm: 450 },
    { key: 10, name: 'Agence SEO Parisienne', tjm: 600 },
    { key: 11, name: 'Hôtel Boutique', tjm: 500 },
    { key: 12, name: 'Cabinet Avocat', tjm: 550 },
    { key: 13, name: 'Maison Édition', tjm: 450 },
    { key: 14, name: 'Photo Studio', tjm: 500 },
  ] as const

  const clientIdByKey = new Map<number, string>()
  for (const clientData of clientsData) {
    const [row] = await db
      .insert(schema.clients)
      .values({
        userId: SEED_USER_ID,
        name: clientData.name,
        billingCountry: 'FR',
        defaultDailyRateCents: c(clientData.tjm),
        defaultPaymentTermsDays: 30,
      })
      .returning()
    clientIdByKey.set(clientData.key, row.id)
  }

  const invoicesData = [
    { id: 'F001', client: 1, date: '2025-01-15', due: '2025-02-15', object: 'Refonte site web', ht: 3300, tva: 660, ttc: 3960, status: 'paid' },
    { id: 'F002', client: 1, date: '2025-01-20', due: '2025-02-20', object: 'Intégration API', ht: 2750, tva: 550, ttc: 3300, status: 'paid' },
    { id: 'F003', client: 2, date: '2025-01-25', due: '2025-02-25', object: 'Design système', ht: 1800, tva: 360, ttc: 2160, status: 'paid' },
    { id: 'F004', client: 3, date: '2025-02-01', due: '2025-03-01', object: 'Migration base de données', ht: 2200, tva: 440, ttc: 2640, status: 'paid' },
    { id: 'F005', client: 1, date: '2025-02-10', due: '2025-03-10', object: 'Optimisation performance', ht: 1650, tva: 330, ttc: 1980, status: 'paid' },
    { id: 'F006', client: 4, date: '2025-02-15', due: '2025-03-15', object: 'Dashboard React', ht: 3900, tva: 780, ttc: 4680, status: 'paid' },
    { id: 'F007', client: 1, date: '2025-02-20', due: '2025-03-20', object: 'Audit de sécurité', ht: 1100, tva: 220, ttc: 1320, status: 'paid' },
    { id: 'F008', client: 5, date: '2025-02-25', due: '2025-03-25', object: 'Développement module', ht: 2200, tva: 440, ttc: 2640, status: 'paid' },
    { id: 'F009', client: 1, date: '2025-03-05', due: '2025-04-05', object: 'Formation Next.js', ht: 1650, tva: 330, ttc: 1980, status: 'paid' },
    { id: 'F010', client: 2, date: '2025-03-10', due: '2025-04-10', object: 'Maintenance site', ht: 550, tva: 110, ttc: 660, status: 'paid' },
    { id: 'F011', client: 6, date: '2025-03-15', due: '2025-04-15', object: 'Refonte interface', ht: 2200, tva: 440, ttc: 2640, status: 'paid' },
    { id: 'F012', client: 1, date: '2025-03-20', due: '2025-04-20', object: 'Tests e2e', ht: 1100, tva: 220, ttc: 1320, status: 'paid' },
    { id: 'F013', client: 3, date: '2025-03-25', due: '2025-04-25', object: 'Intégration paiement', ht: 1650, tva: 330, ttc: 1980, status: 'paid' },
    { id: 'F014', client: 7, date: '2025-04-01', due: '2025-05-01', object: 'Développement back-end', ht: 2200, tva: 440, ttc: 2640, status: 'paid' },
    { id: 'F015', client: 1, date: '2025-04-05', due: '2025-05-05', object: 'Déploiement infra', ht: 1100, tva: 220, ttc: 1320, status: 'paid' },
    { id: 'F016', client: 8, date: '2025-04-10', due: '2025-05-10', object: 'CMS headless', ht: 1650, tva: 330, ttc: 1980, status: 'paid' },
    { id: 'F017', client: 4, date: '2025-04-15', due: '2025-05-15', object: 'Intégration analytics', ht: 1100, tva: 220, ttc: 1320, status: 'paid' },
    { id: 'F018', client: 1, date: '2025-04-20', due: '2025-05-20', object: 'Accessibilité WCAG', ht: 2200, tva: 440, ttc: 2640, status: 'sent' },
    { id: 'F019', client: 9, date: '2025-04-25', due: '2025-05-25', object: 'Application mobile web', ht: 3300, tva: 660, ttc: 3960, status: 'sent' },
    { id: 'F020', client: 10, date: '2025-05-01', due: '2025-06-01', object: 'Migration WordPress', ht: 1650, tva: 330, ttc: 1980, status: 'sent' },
    { id: 'F021', client: 1, date: '2025-05-05', due: '2025-06-05', object: 'Optimisation SEO', ht: 1100, tva: 220, ttc: 1320, status: 'overdue' },
    { id: 'F022', client: 2, date: '2025-05-10', due: '2025-06-10', object: 'Prototype conception', ht: 2200, tva: 440, ttc: 2640, status: 'overdue' },
    { id: 'F023', client: 11, date: '2025-05-15', due: '2025-06-15', object: 'Site booking en ligne', ht: 2750, tva: 550, ttc: 3300, status: 'overdue' },
  ] as const

  let issuedCounter = 0
  for (const inv of invoicesData) {
    const clientId = clientIdByKey.get(inv.client)
    if (!clientId) continue
    issuedCounter += 1
    // Insérée en brouillon d'abord : les lignes ne sont modifiables que tant
    // que la facture est un brouillon (trigger invoice_lines_immutable_once_issued).
    const [invoiceRow] = await db
      .insert(schema.invoices)
      .values({
        userId: SEED_USER_ID,
        clientId,
        seriesId: invoiceSeries.id,
        number: issuedCounter,
        fullNumber: inv.id,
        type: 'standard',
        status: 'draft',
        issueDate: inv.date,
        saleDate: inv.date,
        dueDate: inv.due,
        paymentTermsDays: 30,
        totalHtCents: c(inv.ht),
        totalVatCents: c(inv.tva),
        totalTtcCents: c(inv.ttc),
      })
      .returning()

    await db.insert(schema.invoiceLines).values({
      invoiceId: invoiceRow.id,
      position: 1,
      description: inv.object,
      quantity: '1',
      unitPriceCents: c(inv.ht),
      vatRateBasisPoints: 2000,
      lineTotalHtCents: c(inv.ht),
    })

    // Transition brouillon -> statut final : seule status/paid_amount_cents
    // changent, ce que le trigger d'immuabilité autorise explicitement.
    await db
      .update(schema.invoices)
      .set({ status: inv.status, paidAmountCents: inv.status === 'paid' ? c(inv.ttc) : 0 })
      .where(eq(schema.invoices.id, invoiceRow.id))

    await db.insert(schema.invoiceAuditLog).values([
      { invoiceId: invoiceRow.id, event: 'created', actorUserId: SEED_USER_ID, occurredAt: new Date(inv.date) },
      { invoiceId: invoiceRow.id, event: 'issued', actorUserId: SEED_USER_ID, occurredAt: new Date(inv.date) },
    ])
  }
  await db
    .insert(schema.documentNumberCounters)
    .values({ seriesId: invoiceSeries.id, scopeYear: 2025, lastNumber: issuedCounter })

  const quotesData = [
    { id: 'D001', client: 1, date: '2025-08-15', object: 'Nouveau projet', ht: 5500, tva: 1100, ttc: 6600, status: 'draft' },
    { id: 'D002', client: 4, date: '2025-08-20', object: 'Évolution plateforme', ht: 7700, tva: 1540, ttc: 9240, status: 'sent' },
    { id: 'D003', client: 2, date: '2025-08-22', object: 'Refonte complète', ht: 9900, tva: 1980, ttc: 11880, status: 'sent' },
    { id: 'D004', client: 6, date: '2025-08-25', object: 'App mobile web', ht: 6600, tva: 1320, ttc: 7920, status: 'draft' },
    { id: 'D005', client: 3, date: '2025-08-28', object: 'E-commerce premium', ht: 11000, tva: 2200, ttc: 13200, status: 'draft' },
    { id: 'D006', client: 5, date: '2025-09-01', object: 'Infrastructure cloud', ht: 4400, tva: 880, ttc: 5280, status: 'sent' },
  ] as const

  let quoteCounter = 0
  for (const quote of quotesData) {
    const clientId = clientIdByKey.get(quote.client)
    if (!clientId) continue
    quoteCounter += 1
    const [quoteRow] = await db
      .insert(schema.quotes)
      .values({
        userId: SEED_USER_ID,
        clientId,
        number: quote.id,
        status: quote.status,
        issueDate: quote.date,
        validUntil: '2025-12-01',
        totalHtCents: c(quote.ht),
        totalVatCents: c(quote.tva),
        totalTtcCents: c(quote.ttc),
      })
      .returning()

    await db.insert(schema.quoteLines).values({
      quoteId: quoteRow.id,
      position: 1,
      description: quote.object,
      quantity: '1',
      unitPriceCents: c(quote.ht),
      vatRateBasisPoints: 2000,
      lineTotalHtCents: c(quote.ht),
    })
  }
  await db
    .insert(schema.documentNumberCounters)
    .values({ seriesId: quoteSeries.id, scopeYear: 2025, lastNumber: quoteCounter })

  const [incomeCategory] = await db
    .insert(schema.transactionCategories)
    .values({ userId: SEED_USER_ID, name: 'Encaissements clients', kind: 'income', color: '#3D5B45' })
    .returning()
  const [expenseCategory] = await db
    .insert(schema.transactionCategories)
    .values({ userId: SEED_USER_ID, name: 'Abonnements & outils', kind: 'expense', color: '#E85D2A' })
    .returning()
  const [urssafCategory] = await db
    .insert(schema.transactionCategories)
    .values({ userId: SEED_USER_ID, name: 'Cotisations URSSAF', kind: 'expense', color: '#B88A32' })
    .returning()

  const [bankAccount] = await db
    .insert(schema.bankAccounts)
    .values({ userId: SEED_USER_ID, name: 'Compte pro', iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX', openingBalanceCents: c(8200) })
    .returning()

  await db.insert(schema.transactions).values([
    { userId: SEED_USER_ID, bankAccountId: bankAccount.id, date: '2025-08-02', label: 'Virement Agence Digitale Nord', amountCents: c(2200), categoryId: incomeCategory.id },
    { userId: SEED_USER_ID, bankAccountId: bankAccount.id, date: '2025-08-04', label: 'Abonnement logiciel', amountCents: c(-49), categoryId: expenseCategory.id },
    { userId: SEED_USER_ID, bankAccountId: bankAccount.id, date: '2025-08-08', label: 'Virement E-Commerce Plus', amountCents: c(1650), categoryId: incomeCategory.id },
    { userId: SEED_USER_ID, bankAccountId: bankAccount.id, date: '2025-08-12', label: 'Cotisations sociales', amountCents: c(-1452), categoryId: urssafCategory.id },
    { userId: SEED_USER_ID, bankAccountId: bankAccount.id, date: '2025-08-18', label: 'Virement Agence Digitale Nord', amountCents: c(550), categoryId: incomeCategory.id },
  ])

  await db.insert(schema.deadlines).values([
    { userId: SEED_USER_ID, kind: 'tva', dueDate: '2025-09-15', amountEstimateCents: c(1200) },
    { userId: SEED_USER_ID, kind: 'is', dueDate: '2025-10-15', amountEstimateCents: c(2500) },
    { userId: SEED_USER_ID, kind: 'tva', dueDate: '2025-11-15', amountEstimateCents: c(950) },
    { userId: SEED_USER_ID, kind: 'tva', dueDate: '2025-12-15', amountEstimateCents: c(1100) },
  ])

  const nordClientId = clientIdByKey.get(1)
  if (nordClientId) {
    const [project] = await db
      .insert(schema.projects)
      .values({ userId: SEED_USER_ID, clientId: nordClientId, name: 'Refonte site · Agence Digitale Nord', targetDailyRateCents: c(550) })
      .returning()

    await db.insert(schema.timeEntries).values([
      { userId: SEED_USER_ID, projectId: project.id, date: '2025-08-25', durationMinutes: 450, billable: true, description: 'Intégration composants' },
      { userId: SEED_USER_ID, projectId: project.id, date: '2025-08-26', durationMinutes: 480, billable: true, description: 'Développement API' },
      { userId: SEED_USER_ID, projectId: project.id, date: '2025-08-27', durationMinutes: 405, billable: false, description: 'Réunion cadrage + veille' },
    ])
  }

  console.log('Seed terminé.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
