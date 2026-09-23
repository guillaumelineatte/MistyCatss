import { pgEnum } from 'drizzle-orm/pg-core'

// Statuts juridiques supportés (cf. PROMPT.md « Statut juridique »).
export const statutJuridiqueEnum = pgEnum('statut_juridique', ['micro', 'eurl', 'sasu'])

// Régime de TVA en vigueur pour une période de statut donnée.
export const vatRegimeEnum = pgEnum('vat_regime', ['franchise', 'reel_simplifie', 'reel_normal'])

export const quoteStatusEnum = pgEnum('quote_status', ['draft', 'sent', 'accepted', 'refused', 'expired'])

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'issued',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
])

// 'standard' = facture normale, 'deposit' = facture d'acompte,
// 'situation' = facture de situation, 'credit_note' = avoir.
export const invoiceTypeEnum = pgEnum('invoice_type', ['standard', 'deposit', 'situation', 'credit_note'])

// Journal d'audit inaltérable : un événement par ligne, jamais modifié/supprimé.
export const invoiceEventEnum = pgEnum('invoice_event', [
  'created',
  'issued',
  'sent',
  'viewed',
  'payment_recorded',
  'paid',
  'credit_note_issued',
  'cancelled',
  'reminder_sent',
])

export const transactionCategoryKindEnum = pgEnum('transaction_category_kind', ['income', 'expense'])

export const deadlineKindEnum = pgEnum('deadline_kind', ['urssaf', 'tva', 'is', 'cfe'])

export const deadlineStatusEnum = pgEnum('deadline_status', ['pending', 'done', 'skipped'])

export const vatPeriodStatusEnum = pgEnum('vat_period_status', ['draft', 'prepared', 'filed'])

export const fileKindEnum = pgEnum('file_kind', ['receipt', 'logo', 'export', 'invoice_pdf', 'other'])

export const numberingKindEnum = pgEnum('numbering_kind', ['invoice', 'credit_note', 'quote'])

export const recurringPeriodicityEnum = pgEnum('recurring_periodicity', ['monthly', 'quarterly', 'yearly'])
