import { FinanceShell } from '@/components/finance-shell'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { ClientsScreen, ForecastScreen, InvoicesScreen, SettingsScreen, StyleGuideScreen, TimeScreen, TreasuryScreen } from '@/components/finance-screens'

const routes: Record<string, { title: string; eyebrow: string; content: React.ReactNode }> = {
  styleguide: { title: 'STYLEGUIDE', eyebrow: 'Le système avant le produit', content: <StyleGuideScreen /> },
  invoices: { title: 'DEVIS & FACTURES', eyebrow: '40 factures · 6 devis · 11 880 € à encaisser', content: <InvoicesScreen /> },
  clients: { title: 'CLIENTS', eyebrow: '14 relations · 78 240 € de CA cumulé', content: <ClientsScreen /> },
  treasury: { title: 'TRÉSORERIE & CHARGES', eyebrow: 'Relevé, calendrier, statut juridique', content: <TreasuryScreen /> },
  time: { title: 'TEMPS & RENTABILITÉ', eyebrow: '180 entrées · semaine 35', content: <TimeScreen /> },
  forecast: { title: 'PRÉVISIONNEL', eyebrow: 'Objectif annuel · simulation nette', content: <ForecastScreen /> },
  settings: { title: 'PARAMÈTRES', eyebrow: 'Une seule configuration. La tienne.', content: <div className="flex flex-col gap-8"><SettingsScreen /><ThemeSwitcher /></div> },
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const route = routes[slug.join('/')] ?? routes.styleguide
  return <FinanceShell title={route.title} eyebrow={route.eyebrow}>{route.content}</FinanceShell>
}
