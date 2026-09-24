import { FinanceShell } from '@/components/finance-shell'
import { StyleGuideScreen } from '@/components/finance-screens'

// "settings", "clients", "invoices", "treasury", "forecast" et "time"
// n'apparaissent plus ici : ce sont de vraies routes (app/settings/**,
// app/clients/**, app/invoices/**, app/treasury/**, app/forecast/**,
// app/time/**) depuis les Phases 4-9, prioritaires sur ce routeur mock.
// Seul "styleguide" reste un écran de démonstration légitime.
const routes: Record<string, { title: string; eyebrow: string; content: React.ReactNode }> = {
  styleguide: { title: 'STYLEGUIDE', eyebrow: 'Le système avant le produit', content: <StyleGuideScreen /> },
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const route = routes[slug.join('/')] ?? routes.styleguide
  return <FinanceShell title={route.title} eyebrow={route.eyebrow}>{route.content}</FinanceShell>
}
