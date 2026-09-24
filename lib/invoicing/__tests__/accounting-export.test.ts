import { describe, expect, it } from 'vitest'

import type { clients, invoices } from '@/db/schema'
import { buildInvoicesCsv, buildInvoicesFec } from '../accounting-export'

type Invoice = typeof invoices.$inferSelect & { client: typeof clients.$inferSelect | null }

function makeInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv-1',
    userId: 'u1',
    clientId: 'c1',
    quoteId: null,
    seriesId: null,
    number: 1,
    fullNumber: 'F2026-001',
    type: 'standard',
    status: 'issued',
    creditNoteForInvoiceId: null,
    recurringTemplateId: null,
    issueDate: '2026-01-15',
    saleDate: '2026-01-15',
    dueDate: '2026-02-14',
    paymentTermsDays: 30,
    escompteConditions: null,
    latePenaltyRateBasisPoints: null,
    lateRecoveryIndemnityCents: null,
    buyerReference: null,
    paymentMeansCode: null,
    reverseCharge: false,
    currency: 'EUR',
    notes: null,
    publicToken: 'tok',
    totalHtCents: 100000,
    totalVatCents: 20000,
    totalTtcCents: 120000,
    paidAmountCents: 0,
    legalSnapshot: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    client: { id: 'c1', name: 'Client Test' } as Invoice['client'],
    ...overrides,
  } as Invoice
}

describe('buildInvoicesCsv', () => {
  it('inclut une ligne par facture avec les montants en euros', () => {
    const csv = buildInvoicesCsv([makeInvoice({})])
    expect(csv).toContain('F2026-001')
    expect(csv).toContain('1000') // 100000 cents -> 1000 euros
  })
})

describe('buildInvoicesFec', () => {
  it('équilibre chaque écriture (somme débit = somme crédit)', () => {
    const fec = buildInvoicesFec([makeInvoice({})])
    const rows = fec.split('\r\n').slice(1).filter(Boolean)
    const byEcriture = new Map<string, { debit: number; credit: number }>()
    for (const row of rows) {
      const cols = row.split('\t')
      const num = cols[2]
      const debit = Number(cols[11])
      const credit = Number(cols[12])
      const acc = byEcriture.get(num) ?? { debit: 0, credit: 0 }
      acc.debit += debit
      acc.credit += credit
      byEcriture.set(num, acc)
    }
    expect(byEcriture.size).toBe(1)
    for (const { debit, credit } of byEcriture.values()) {
      expect(debit).toBeCloseTo(credit, 2)
    }
  })

  it('inverse débit/crédit pour un avoir, toujours équilibré', () => {
    const fec = buildInvoicesFec([makeInvoice({ type: 'credit_note', fullNumber: 'A2026-001' })])
    const rows = fec.split('\r\n').slice(1).filter(Boolean)
    let totalDebit = 0
    let totalCredit = 0
    for (const row of rows) {
      const cols = row.split('\t')
      totalDebit += Number(cols[11])
      totalCredit += Number(cols[12])
    }
    expect(totalDebit).toBeCloseTo(totalCredit, 2)
    expect(rows[0]).toContain(String(1200)) // ligne client créditée de 1200 (TTC)
  })

  it('ignore les factures brouillon (pas encore une écriture comptable)', () => {
    const fec = buildInvoicesFec([makeInvoice({ status: 'draft' })])
    const rows = fec.split('\r\n').slice(1).filter(Boolean)
    expect(rows).toHaveLength(0)
  })
})
