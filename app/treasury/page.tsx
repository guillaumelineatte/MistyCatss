import { FinanceShell } from '@/components/finance-shell'
import { TreasuryScreen } from '@/components/treasury/treasury-screen'
import { requireSession } from '@/lib/auth/session'
import { listDeadlines } from '@/lib/deadlines/queries'
import { getFiscalParams } from '@/lib/fiscal/get-params'
import { computeRealizedCa } from '@/lib/fiscal/queries'
import { getStatusPeriodAtDate } from '@/lib/invoicing/queries'
import { listBankAccounts, listCategories, listCategoryRules, listReconcilableInvoices, listTransactions } from '@/lib/treasury/queries'
import { listVatPeriods } from '@/lib/vat/queries'

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; account?: string; category?: string }>
}) {
  const session = await requireSession()
  const { q, account, category } = await searchParams

  const today = new Date().toISOString().slice(0, 10)
  const yearStart = `${new Date().getFullYear()}-01-01`
  const yearEnd = `${new Date().getFullYear()}-12-31`

  const [bankAccounts, transactions, categories, categoryRules, reconcilableInvoices, deadlines, vatPeriods, statusPeriod, realizedCaCents] =
    await Promise.all([
      listBankAccounts(),
      listTransactions({ search: q || undefined, bankAccountId: account || undefined, categoryId: category || undefined }),
      listCategories(),
      listCategoryRules(),
      listReconcilableInvoices(),
      listDeadlines(),
      listVatPeriods(),
      getStatusPeriodAtDate(session.user.id, today),
      computeRealizedCa(yearStart, yearEnd),
    ])

  const fiscalParams = statusPeriod
    ? await getFiscalParams(session.user.id, new Date().getFullYear(), statusPeriod.status)
    : null

  return (
    <FinanceShell title="TRÉSORERIE" eyebrow={`${bankAccounts.length} compte(s) · ${transactions.length} transaction(s)`}>
      <TreasuryScreen
        bankAccounts={bankAccounts}
        transactions={transactions}
        categories={categories}
        categoryRules={categoryRules}
        reconcilableInvoices={reconcilableInvoices}
        deadlines={deadlines}
        vatPeriods={vatPeriods}
        statusPeriod={statusPeriod}
        fiscalParams={fiscalParams}
        realizedCaCents={realizedCaCents}
      />
    </FinanceShell>
  )
}
