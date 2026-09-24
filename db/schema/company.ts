import { relations } from 'drizzle-orm'
import { boolean, date, index, integer, jsonb, numeric, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { numberingKindEnum, statutJuridiqueEnum, vatRegimeEnum } from './enums'

// Informations d'entreprise : 1 ligne par utilisateur, tout nullable par
// défaut (PROMPT.md « Paramètres fiscaux et informations d'entreprise :
// absents par défaut »). Aucune valeur fictive, jamais de fallback en dur.
export const companies = pgTable('companies', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  legalName: text('legal_name'),
  siret: text('siret'),
  siren: text('siren'),
  vatNumber: text('vat_number'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  postalCode: text('postal_code'),
  city: text('city'),
  country: text('country').default('FR'),
  iban: text('iban'),
  bic: text('bic'),
  rcsCity: text('rcs_city'),
  shareCapitalCents: integer('share_capital_cents'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  logoFileId: text('logo_file_id'),
  // Valeurs par défaut des mentions légales de facturation (Phase 6) : jamais
  // de barème inventé en remplacement (PROMPT.md « Interdiction d'inventer »)
  // — la facture s'émet quand même si absentes, avec un bandeau d'avertissement.
  defaultEscompteConditions: text('default_escompte_conditions'),
  defaultLatePenaltyRateBasisPoints: integer('default_late_penalty_rate_basis_points'),
  defaultLateRecoveryIndemnityCents: integer('default_late_recovery_indemnity_cents'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Statut juridique en vigueur PAR PÉRIODE, jamais un champ unique sur le
// profil. Au plus une période "ouverte" (end_date NULL) par utilisateur,
// garanti par un index unique partiel. La non-superposition des périodes
// (ouvertes et closes) est en plus garantie au niveau base par une contrainte
// EXCLUDE (voir migration custom 0001).
export const statusPeriods = pgTable(
  'status_periods',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: statutJuridiqueEnum('status').notNull(),
    vatRegime: vatRegimeEnum('vat_regime').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('status_periods_user_idx').on(table.userId, table.startDate),
    unique('status_periods_one_open_per_user').on(table.userId, table.endDate).nullsNotDistinct(),
  ],
)

// Paramètres fiscaux par année/statut : valeurs éditées depuis l'interface.
// lib/fiscal/params/<year>.ts fournit la forme + la doc de chaque clé et sert
// de valeur par défaut ; cette table est celle qui fait foi dès qu'une valeur
// y est présente (voir lib/fiscal/get-params.ts, Phase 4).
export const fiscalParamOverrides = pgTable(
  'fiscal_param_overrides',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    status: statutJuridiqueEnum('status').notNull(),
    paramKey: text('param_key').notNull(),
    // Numeric générique : selon paramKey, une valeur peut être un taux (%),
    // un seuil ou un abattement en centimes, documenté dans lib/fiscal/params.
    value: numeric('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('fiscal_param_overrides_unique').on(table.userId, table.year, table.status, table.paramKey)],
)

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  defaultDailyRateCents: integer('default_daily_rate_cents'),
  defaultPaymentTermsDays: integer('default_payment_terms_days').default(30),
  onboardingCompletedSteps: jsonb('onboarding_completed_steps').$type<string[]>().default([]),
  // Palette choisie dans le sélecteur de thème (finance-shell.tsx / theme-switcher.tsx).
  theme: text('theme').default('sauge'),
  // Objectif de CA annuel (Phase 8, écran Prévisionnel) : saisi par
  // l'utilisateur, jamais déduit — absent tant qu'il n'a rien renseigné.
  annualRevenueGoalCents: integer('annual_revenue_goal_cents'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// Configuration des séries de numérotation (préfixe, remise à zéro annuelle).
// Le compteur atomique lui-même vit dans documentNumberCounters.
export const numberingSeries = pgTable(
  'numbering_series',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: numberingKindEnum('kind').notNull(),
    prefix: text('prefix').notNull(),
    yearlyReset: boolean('yearly_reset').default(true).notNull(),
    paddingLength: integer('padding_length').default(3).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('numbering_series_unique').on(table.userId, table.kind, table.prefix)],
)

// Compteur atomique par série : incrémenté en transaction avec verrou de ligne
// (SELECT ... FOR UPDATE) au moment de l'émission, jamais avant. scopeYear=0
// est une sentinelle "pas de remise à zéro annuelle" (numérotation continue).
export const documentNumberCounters = pgTable(
  'document_number_counters',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    seriesId: text('series_id')
      .notNull()
      .references(() => numberingSeries.id, { onDelete: 'cascade' }),
    scopeYear: integer('scope_year').notNull(),
    lastNumber: integer('last_number').default(0).notNull(),
  },
  (table) => [unique('document_number_counters_unique').on(table.seriesId, table.scopeYear)],
)

export const emailTemplates = pgTable(
  'email_templates',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    subject: text('subject').notNull(),
    bodyHtml: text('body_html').notNull(),
    isCustom: boolean('is_custom').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('email_templates_unique').on(table.userId, table.kind)],
)

export const companiesRelations = relations(companies, ({ one }) => ({
  user: one(user, { fields: [companies.userId], references: [user.id] }),
}))

export const statusPeriodsRelations = relations(statusPeriods, ({ one }) => ({
  user: one(user, { fields: [statusPeriods.userId], references: [user.id] }),
}))

export const numberingSeriesRelations = relations(numberingSeries, ({ one, many }) => ({
  user: one(user, { fields: [numberingSeries.userId], references: [user.id] }),
  counters: many(documentNumberCounters),
}))

export const documentNumberCountersRelations = relations(documentNumberCounters, ({ one }) => ({
  series: one(numberingSeries, { fields: [documentNumberCounters.seriesId], references: [numberingSeries.id] }),
}))
