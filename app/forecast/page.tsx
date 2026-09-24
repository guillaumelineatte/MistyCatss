import { FinanceShell } from '@/components/finance-shell'
import { ForecastScreen } from '@/components/forecast/forecast-screen'
import { requireSession } from '@/lib/auth/session'
import { getFiscalParams } from '@/lib/fiscal/get-params'
import { computeRealizedCa } from '@/lib/fiscal/queries'
import { getCashflowProjection, getRevenueGoalCents, getSentQuotesPipeline } from '@/lib/forecast/queries'

const STATUSES = ['micro', 'eurl', 'sasu'] as const

export default async function ForecastPage() {
  const session = await requireSession()
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const [revenueGoalCents, realizedCaCents, pipeline, cashflow3m, cashflow6m, fiscalParamsResults] = await Promise.all([
    getRevenueGoalCents(session.user.id),
    computeRealizedCa(yearStart, yearEnd),
    getSentQuotesPipeline(session.user.id),
    getCashflowProjection(session.user.id, 90),
    getCashflowProjection(session.user.id, 180),
    Promise.all(STATUSES.map((status) => getFiscalParams(session.user.id, year, status))),
  ])

  const fiscalParamsByStatus = Object.fromEntries(STATUSES.map((status, index) => [status, fiscalParamsResults[index]])) as Record<
    (typeof STATUSES)[number],
    (typeof fiscalParamsResults)[number]
  >

  return (
    <FinanceShell title="PRÉVISIONNEL" eyebrow="Objectif, pipeline, trésorerie projetée, simulateur">
      <ForecastScreen
        revenueGoalCents={revenueGoalCents}
        realizedCaCents={realizedCaCents}
        pipeline={pipeline}
        cashflow3m={cashflow3m}
        cashflow6m={cashflow6m}
        fiscalParamsByStatus={fiscalParamsByStatus}
      />
    </FinanceShell>
  )
}
