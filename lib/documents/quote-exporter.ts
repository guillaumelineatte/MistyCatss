import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'

import type { clients, quoteLines, quotes } from '@/db/schema'
import type { DocumentExporter } from './exporter'
import { QuoteDocument } from './quote-pdf'

export type QuoteExportData = {
  quote: typeof quotes.$inferSelect
  lines: (typeof quoteLines.$inferSelect)[]
  client: typeof clients.$inferSelect | null
  seller: {
    legalName: string | null
    addressLine1: string | null
    postalCode: string | null
    city: string | null
    siret: string | null
    email: string | null
  } | null
}

/** Implémentation "classique" derrière DocumentExporter — voir lib/documents/exporter.ts. */
export const quoteExporter: DocumentExporter<QuoteExportData> = {
  async export(data) {
    return renderToBuffer(QuoteDocument(data))
  },
}
