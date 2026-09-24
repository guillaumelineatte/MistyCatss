import 'server-only'

import { renderToBuffer } from '@react-pdf/renderer'

import type { clients, invoiceLines, invoices } from '@/db/schema'
import type { DocumentExporter } from './exporter'
import { InvoiceDocument } from './invoice-pdf'

export type InvoiceExportData = {
  invoice: typeof invoices.$inferSelect
  lines: (typeof invoiceLines.$inferSelect)[]
  client: typeof clients.$inferSelect | null
}

/**
 * Implémentation "classique" de l'InvoiceExporter décrit par PROMPT.md,
 * derrière DocumentExporter<T> (lib/documents/exporter.ts). N'implémente ni
 * le XML CII ni le PDF/A-3 Factur-X : le schéma des factures porte déjà les
 * champs nécessaires (identifiants, TVA, référence de commande, moyen de
 * paiement) pour qu'une future implémentation Factur-X substitue celle-ci
 * sans changer le code appelant.
 */
export const invoiceExporter: DocumentExporter<InvoiceExportData> = {
  async export(data) {
    return renderToBuffer(InvoiceDocument(data))
  },
}
