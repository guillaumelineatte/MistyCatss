import type { clients as clientsTable, quotes as quotesTable, StatutJuridique } from '@/db/schema'
import type { CashflowProjectionResult } from '@/lib/fiscal/forecast'
import type { FiscalParamsResult } from '@/lib/fiscal/get-params'
import { CashflowCard } from './cashflow-card'
import { NetIncomeSimulator } from './net-income-simulator'
import { PipelineCard } from './pipeline-card'
import { RevenueGoalCard } from './revenue-goal-card'

type Quote = typeof quotesTable.$inferSelect & { client?: typeof clientsTable.$inferSelect | null }

export function ForecastScreen({
  revenueGoalCents,
  realizedCaCents,
  pipeline,
  cashflow3m,
  cashflow6m,
  fiscalParamsByStatus,
}: {
  revenueGoalCents: number | null
  realizedCaCents: number
  pipeline: { quotes: Quote[]; weightedCents: number; unweightedCents: number }
  cashflow3m: CashflowProjectionResult
  cashflow6m: CashflowProjectionResult
  fiscalParamsByStatus: Record<StatutJuridique, FiscalParamsResult>
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <RevenueGoalCard goalCents={revenueGoalCents} realizedCents={realizedCaCents} />
        <PipelineCard quotes={pipeline.quotes} weightedCents={pipeline.weightedCents} unweightedCents={pipeline.unweightedCents} />
      </div>

      <CashflowCard cashflow3m={cashflow3m} cashflow6m={cashflow6m} />

      <NetIncomeSimulator fiscalParamsByStatus={fiscalParamsByStatus} />
    </div>
  )
}
