import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { clients, invoiceLines, invoices } from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { registerPdfFonts } from './fonts'

registerPdfFonts()

const INK = '#171713'
const PAPER = '#F4EBDD'
const ORANGE = '#E85D2A'

const styles = StyleSheet.create({
  page: { backgroundColor: PAPER, color: INK, padding: 32, fontFamily: 'Space Grotesk', fontSize: 10 },
  border: { borderWidth: 2, borderColor: INK, padding: 20, height: '100%' },
  brand: { fontFamily: 'Anton', fontSize: 22, textTransform: 'uppercase', letterSpacing: -0.5 },
  brandAccent: { color: ORANGE },
  title: { fontFamily: 'Anton', fontSize: 32, textTransform: 'uppercase', marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  mono: { fontFamily: 'JetBrains Mono', fontSize: 9 },
  section: { marginTop: 20 },
  label: { fontFamily: 'JetBrains Mono', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 },
  table: { marginTop: 12, borderTopWidth: 2, borderTopColor: INK },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: INK, paddingVertical: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingVertical: 6 },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: 220 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalsRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTopWidth: 2, borderTopColor: INK },
  legal: { marginTop: 20, fontFamily: 'JetBrains Mono', fontSize: 7, lineHeight: 1.5, opacity: 0.75 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, fontFamily: 'JetBrains Mono', fontSize: 8, opacity: 0.6 },
})

type Invoice = typeof invoices.$inferSelect
type InvoiceLine = typeof invoiceLines.$inferSelect
type Client = typeof clients.$inferSelect

type LegalSnapshot = {
  sellerLegalName?: string
  sellerSiret?: string
  sellerAddress?: string | null
  vatMention?: string
  escompteConditions?: string
  latePenaltyRateBasisPoints?: number
  lateRecoveryIndemnityCents?: number
}

const formatDate = (value: string | null) => (value ? value.split('-').reverse().join('/') : '—')

export function InvoiceDocument({ invoice, lines, client }: { invoice: Invoice; lines: InvoiceLine[]; client: Client | null }) {
  const legal = (invoice.legalSnapshot ?? {}) as LegalSnapshot
  const isCredit = invoice.type === 'credit_note'

  return (
    <Document title={`${isCredit ? 'Avoir' : 'Facture'} ${invoice.fullNumber ?? ''}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.row}>
            <Text style={styles.brand}>
              ARGENT<Text style={styles.brandAccent}>BRUT</Text>
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Date d&apos;émission</Text>
              <Text style={styles.mono}>{formatDate(invoice.issueDate)}</Text>
              <Text style={[styles.label, { marginTop: 6 }]}>Échéance</Text>
              <Text style={styles.mono}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>

          <Text style={styles.title}>{isCredit ? 'AVOIR' : 'FACTURE'} {invoice.fullNumber ?? '(brouillon)'}</Text>

          <View style={[styles.row, styles.section]}>
            <View style={{ maxWidth: 220 }}>
              <Text style={styles.label}>De</Text>
              <Text style={{ marginTop: 4 }}>{legal.sellerLegalName ?? 'Entreprise non renseignée'}</Text>
              {legal.sellerAddress && <Text style={styles.mono}>{legal.sellerAddress}</Text>}
              {legal.sellerSiret && <Text style={styles.mono}>SIRET {legal.sellerSiret}</Text>}
              {legal.vatMention && <Text style={styles.mono}>{legal.vatMention}</Text>}
            </View>
            <View style={{ maxWidth: 220 }}>
              <Text style={styles.label}>Pour</Text>
              <Text style={{ marginTop: 4 }}>{client?.name ?? 'Client'}</Text>
              {client?.billingAddressLine1 && <Text style={styles.mono}>{client.billingAddressLine1}</Text>}
              {(client?.billingPostalCode || client?.billingCity) && (
                <Text style={styles.mono}>{[client?.billingPostalCode, client?.billingCity].filter(Boolean).join(' ')}</Text>
              )}
              {client?.siret && <Text style={styles.mono}>SIRET {client.siret}</Text>}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colDescription, styles.label]}>Description</Text>
              <Text style={[styles.colQty, styles.label]}>Qté</Text>
              <Text style={[styles.colPrice, styles.label]}>PU HT</Text>
              <Text style={[styles.colTotal, styles.label]}>Total HT</Text>
            </View>
            {lines.map((line) => (
              <View style={styles.tableRow} key={line.id}>
                <Text style={styles.colDescription}>{line.description}</Text>
                <Text style={[styles.colQty, styles.mono]}>{line.quantity}</Text>
                <Text style={[styles.colPrice, styles.mono]}>{formatEuros(line.unitPriceCents)}</Text>
                <Text style={[styles.colTotal, styles.mono]}>{formatEuros(line.lineTotalHtCents)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalsRow}>
              <Text style={styles.mono}>Total HT</Text>
              <Text style={styles.mono}>{formatEuros(invoice.totalHtCents)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.mono}>TVA</Text>
              <Text style={styles.mono}>{formatEuros(invoice.totalVatCents)}</Text>
            </View>
            <View style={styles.totalsRowFinal}>
              <Text style={[styles.mono, { fontFamily: 'Anton', fontSize: 14 }]}>Total TTC</Text>
              <Text style={[styles.mono, { fontFamily: 'Anton', fontSize: 14 }]}>{formatEuros(invoice.totalTtcCents)}</Text>
            </View>
          </View>

          {invoice.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <Text style={[styles.mono, { marginTop: 4 }]}>{invoice.notes}</Text>
            </View>
          )}

          {!isCredit && (
            <View style={styles.legal}>
              {legal.escompteConditions && <Text>Escompte : {legal.escompteConditions}</Text>}
              {legal.latePenaltyRateBasisPoints != null && (
                <Text>Pénalités de retard : {(legal.latePenaltyRateBasisPoints / 100).toLocaleString('fr-FR')} % par an</Text>
              )}
              {legal.lateRecoveryIndemnityCents != null && (
                <Text>Indemnité forfaitaire de recouvrement : {formatEuros(legal.lateRecoveryIndemnityCents)}</Text>
              )}
              {invoice.reverseCharge && <Text>Autoliquidation de la TVA par le client (art. 283-2 du CGI)</Text>}
            </View>
          )}

          <Text style={styles.footer}>Document généré par Argent Brut.</Text>
        </View>
      </Page>
    </Document>
  )
}
