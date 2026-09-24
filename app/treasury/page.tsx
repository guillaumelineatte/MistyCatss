import { FinanceShell } from '@/components/finance-shell'
import { TreasuryScreen } from '@/components/treasury/treasury-screen'
import { requireSession } from '@/lib/auth/session'
import { listBankAccounts, listCategories, listCategoryRules, listReconcilableInvoices, listTransactions } from '@/lib/treasury/queries'

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; account?: string; category?: string }>
}) {
  await requireSession()
  const { q, account, category } = await searchParams

  const [bankAccounts, transactions, categories, categoryRules, reconcilableInvoices] = await Promise.all([
    listBankAccounts(),
    listTransactions({ search: q || undefined, bankAccountId: account || undefined, categoryId: category || undefined }),
    listCategories(),
    listCategoryRules(),
    listReconcilableInvoices(),
  ])

  return (
    <FinanceShell title="TRÉSORERIE" eyebrow={`${bankAccounts.length} compte(s) · ${transactions.length} transaction(s)`}>
      <TreasuryScreen
        bankAccounts={bankAccounts}
        transactions={transactions}
        categories={categories}
        categoryRules={categoryRules}
        reconcilableInvoices={reconcilableInvoices}
      />
    </FinanceShell>
  )
}
