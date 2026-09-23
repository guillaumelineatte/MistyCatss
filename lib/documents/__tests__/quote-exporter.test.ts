import { describe, expect, it } from 'vitest'

import type { clients, quoteLines, quotes } from '@/db/schema'
import { quoteExporter } from '../quote-exporter'

const quote = {
  id: 'test-id',
  userId: 'u1',
  clientId: 'c1',
  quoteId: null,
  number: 'D2026-001',
  status: 'draft',
  issueDate: '2026-01-15',
  validUntil: '2026-02-15',
  currency: 'EUR',
  notes: 'Merci de valider avant le 15/02.',
  publicToken: 'tok',
  acceptedAt: null,
  acceptedIp: null,
  totalHtCents: 150000,
  totalVatCents: 30000,
  totalTtcCents: 180000,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as typeof quotes.$inferSelect

const lines = [
  {
    id: 'l1',
    quoteId: 'test-id',
    position: 0,
    description: 'Développement site vitrine',
    quantity: '3',
    unitPriceCents: 50000,
    discountPercentBasisPoints: null,
    discountAmountCents: null,
    vatRateBasisPoints: 2000,
    lineTotalHtCents: 150000,
  },
] as unknown as (typeof quoteLines.$inferSelect)[]

const client = {
  id: 'c1',
  name: 'Agence Test',
  billingAddressLine1: '1 rue Test',
  billingPostalCode: '75001',
  billingCity: 'Paris',
  siret: '12345678900012',
} as unknown as typeof clients.$inferSelect

describe('quoteExporter', () => {
  it('génère un PDF valide avec les lignes et totaux', async () => {
    const buffer = await quoteExporter.export({
      quote,
      lines,
      client,
      seller: { legalName: 'Alex Martin', addressLine1: '2 rue Seller', postalCode: '69000', city: 'Lyon', siret: '98765432100012', email: 'alex@brut.dev' },
    })

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('gère un vendeur non renseigné sans planter (paramètres absents par défaut)', async () => {
    const buffer = await quoteExporter.export({ quote, lines, client: null, seller: null })
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
  })
})
