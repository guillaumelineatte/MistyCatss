import { FinanceShell } from '@/components/finance-shell'
import { ForecastScreen, StyleGuideScreen, TimeScreen } from '@/components/finance-screens'

// "settings", "clients", "invoices" et "treasury" n'apparaissent plus ici :
// ce sont de vraies routes (app/settings/**, app/clients/**, app/invoices/**,
// app/treasury/**) depuis les Phases 4-7, prioritaires sur ce routeur mock.
const routes: Record<string, { title: string; eyebrow: string; content: React.ReactNode }> = {
  styleguide: { title: 'STYLEGUIDE', eyebrow: 'Le système avant le produit', content: <StyleGuideScreen /> },
  time: { title: 'TEMPS & RENTABILITÉ', eyebrow: '180 entrées · semaine 35', content: <TimeScreen /> },
  forecast: { title: 'PRÉVISIONNEL', eyebrow: 'Objectif annuel · simulation nette', content: <ForecastScreen /> },
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const route = routes[slug.join('/')] ?? routes.styleguide
  return <FinanceShell title={route.title} eyebrow={route.eyebrow}>{route.content}</FinanceShell>
}
