import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import type { clients, quoteLines, quotes } from '@/db/schema'
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
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, fontFamily: 'JetBrains Mono', fontSize: 8, opacity: 0.6 },
})

type Quote = typeof quotes.$inferSelect
type QuoteLine = typeof quoteLines.$inferSelect
type Client = typeof clients.$inferSelect

type SellerInfo = {
  legalName: string | null
  addressLine1: string | null
  postalCode: string | null
  city: string | null
  siret: string | null
  email: string | null
}

const formatDate = (value: string | null) => (value ? value.split('-').reverse().join('/') : '—')

export function QuoteDocument({ quote, lines, client, seller }: { quote: Quote; lines: QuoteLine[]; client: Client | null; seller: SellerInfo | null }) {
  return (
    <Document title={`Devis ${quote.number ?? ''}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.row}>
            <Text style={styles.brand}>
              ARGENT<Text style={styles.brandAccent}>BRUT</Text>
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Date d&apos;émission</Text>
              <Text style={styles.mono}>{formatDate(quote.issueDate)}</Text>
              {quote.validUntil && (
                <>
                  <Text style={[styles.label, { marginTop: 6 }]}>Valable jusqu&apos;au</Text>
                  <Text style={styles.mono}>{formatDate(quote.validUntil)}</Text>
                </>
              )}
            </View>
          </View>

          <Text style={styles.title}>DEVIS {quote.number ?? '(brouillon)'}</Text>

          <View style={[styles.row, styles.section]}>
            <View style={{ maxWidth: 220 }}>
              <Text style={styles.label}>De</Text>
              <Text style={{ marginTop: 4 }}>{seller?.legalName ?? 'Entreprise non renseignée'}</Text>
              {seller?.addressLine1 && <Text style={styles.mono}>{seller.addressLine1}</Text>}
              {(seller?.postalCode || seller?.city) && (
                <Text style={styles.mono}>{[seller?.postalCode, seller?.city].filter(Boolean).join(' ')}</Text>
              )}
              {seller?.siret && <Text style={styles.mono}>SIRET {seller.siret}</Text>}
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
              <Text style={styles.mono}>{formatEuros(quote.totalHtCents)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.mono}>TVA</Text>
              <Text style={styles.mono}>{formatEuros(quote.totalVatCents)}</Text>
            </View>
            <View style={styles.totalsRowFinal}>
              <Text style={[styles.mono, { fontFamily: 'Anton', fontSize: 14 }]}>Total TTC</Text>
              <Text style={[styles.mono, { fontFamily: 'Anton', fontSize: 14 }]}>{formatEuros(quote.totalTtcCents)}</Text>
            </View>
          </View>

          {quote.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <Text style={[styles.mono, { marginTop: 4 }]}>{quote.notes}</Text>
            </View>
          )}

          <Text style={styles.footer}>
            {seller?.email ? `${seller.email} · ` : ''}Devis généré par Argent Brut.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
