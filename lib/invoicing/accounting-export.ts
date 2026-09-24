import 'server-only'

import type { clients, invoices } from '@/db/schema'
import { centsToEuros } from '@/lib/money'

type Invoice = typeof invoices.$inferSelect & { client: typeof clients.$inferSelect | null }

function csvEscape(value: string): string {
  if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Export comptable simple : une ligne par facture émise. */
export function buildInvoicesCsv(invoiceRows: Invoice[]): string {
  const header = ['Numero', 'Type', 'Date', 'Echeance', 'Client', 'HT', 'TVA', 'TTC', 'Statut', 'Paye']
  const rows = invoiceRows.map((invoice) => [
    invoice.fullNumber ?? '',
    invoice.type,
    invoice.issueDate ?? '',
    invoice.dueDate ?? '',
    invoice.client?.name ?? '',
    String(centsToEuros(invoice.totalHtCents)),
    String(centsToEuros(invoice.totalVatCents)),
    String(centsToEuros(invoice.totalTtcCents)),
    invoice.status,
    String(centsToEuros(invoice.paidAmountCents)),
  ])
  return [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n')
}

// Comptes du Plan Comptable Général standard (structure comptable, pas un
// paramètre fiscal propre à l'utilisateur — pas concerné par l'interdiction
// d'inventer des taux/barèmes) : 411 Clients, 706 Prestations de services,
// 445711 TVA collectée.
const ACCOUNT_CLIENT = '411000'
const ACCOUNT_SALES = '706000'
const ACCOUNT_VAT_COLLECTED = '445711'

const FEC_COLUMNS = [
  'JournalCode',
  'JournalLib',
  'EcritureNum',
  'EcritureDate',
  'CompteNum',
  'CompteLib',
  'CompAuxNum',
  'CompAuxLib',
  'PieceRef',
  'PieceDate',
  'EcritureLib',
  'Debit',
  'Credit',
  'EcritureLet',
  'DateLet',
  'ValidDate',
  'Montantdevise',
  'Idevise',
]

const fecDate = (value: string) => value.replaceAll('-', '')
const fecAmount = (cents: number) => centsToEuros(Math.abs(cents)).toFixed(2)

/**
 * Export FEC (Fichier des Écritures Comptables, format réglementaire
 * français) : une écriture équilibrée par facture émise (débit client,
 * crédit vente + TVA collectée ; inversé pour un avoir). N'implémente pas de
 * lettrage ni de rapprochement bancaire (Phase 7).
 */
export function buildInvoicesFec(invoiceRows: Invoice[]): string {
  const lines: string[][] = [FEC_COLUMNS]
  let ecritureNum = 1

  for (const invoice of invoiceRows) {
    if (invoice.status === 'draft') continue
    const num = String(ecritureNum).padStart(6, '0')
    ecritureNum += 1
    const isCredit = invoice.type === 'credit_note'
    const label = `${isCredit ? 'Avoir' : 'Facture'} ${invoice.fullNumber ?? ''} ${invoice.client?.name ?? ''}`.trim()
    const date = fecDate(invoice.issueDate ?? invoice.createdAt.toISOString().slice(0, 10))
    const pieceRef = invoice.fullNumber ?? invoice.id

    const clientDebit = isCredit ? 0 : invoice.totalTtcCents
    const clientCredit = isCredit ? invoice.totalTtcCents : 0
    const salesDebit = isCredit ? invoice.totalHtCents : 0
    const salesCredit = isCredit ? 0 : invoice.totalHtCents
    const vatDebit = isCredit ? invoice.totalVatCents : 0
    const vatCredit = isCredit ? 0 : invoice.totalVatCents

    lines.push([
      'VT',
      'Ventes',
      num,
      date,
      ACCOUNT_CLIENT,
      'Clients',
      invoice.clientId,
      invoice.client?.name ?? '',
      pieceRef,
      date,
      label,
      fecAmount(clientDebit),
      fecAmount(clientCredit),
      '',
      '',
      date,
      '',
      '',
    ])
    lines.push([
      'VT',
      'Ventes',
      num,
      date,
      ACCOUNT_SALES,
      'Prestations de services',
      '',
      '',
      pieceRef,
      date,
      label,
      fecAmount(salesDebit),
      fecAmount(salesCredit),
      '',
      '',
      date,
      '',
      '',
    ])
    if (invoice.totalVatCents !== 0) {
      lines.push([
        'VT',
        'Ventes',
        num,
        date,
        ACCOUNT_VAT_COLLECTED,
        'TVA collectée',
        '',
        '',
        pieceRef,
        date,
        label,
        fecAmount(vatDebit),
        fecAmount(vatCredit),
        '',
        '',
        date,
        '',
        '',
      ])
    }
  }

  return lines.map((row) => row.join('\t')).join('\r\n')
}
