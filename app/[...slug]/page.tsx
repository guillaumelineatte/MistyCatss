import { FinanceShell } from '@/components/finance-shell'
import { ClientsScreen, ForecastScreen, InvoicesScreen, StyleGuideScreen, TimeScreen, TreasuryScreen } from '@/components/finance-screens'

// "settings" n'apparaît plus ici : /settings et /settings/* sont de vraies
// routes (app/settings/**) depuis la Phase 4, prioritaires sur ce routeur mock.
const routes: Record<string, { title: string; eyebrow: string; content: React.ReactNode }> = {
  styleguide: { title: 'STYLEGUIDE', eyebrow: 'Le système avant le produit', content: <StyleGuideScreen /> },
  invoices: { title: 'DEVIS & FACTURES', eyebrow: '40 factures · 6 devis · 11 880 € à encaisser', content: <InvoicesScreen /> },
  clients: { title: 'CLIENTS', eyebrow: '14 relations · 78 240 € de CA cumulé', content: <ClientsScreen /> },
  treasury: { title: 'TRÉSORERIE & CHARGES', eyebrow: 'Relevé, calendrier, statut juridique', content: <TreasuryScreen /> },
  time: { title: 'TEMPS & RENTABILITÉ', eyebrow: '180 entrées · semaine 35', content: <TimeScreen /> },
  forecast: { title: 'PRÉVISIONNEL', eyebrow: 'Objectif annuel · simulation nette', content: <ForecastScreen /> },
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const route = routes[slug.join('/')] ?? routes.styleguide
  return <FinanceShell title={route.title} eyebrow={route.eyebrow}>{route.content}</FinanceShell>
}
