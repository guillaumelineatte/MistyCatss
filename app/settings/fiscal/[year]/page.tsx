import { notFound } from 'next/navigation'

import { FinanceShell } from '@/components/finance-shell'
import { FiscalYearForm } from '@/components/settings/fiscal-year-form'
import { requireSession } from '@/lib/auth/session'
import { getFiscalParams } from '@/lib/fiscal/get-params'

const STATUSES = ['micro', 'eurl', 'sasu'] as const

export default async function FiscalYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params
  const year = Number(yearParam)
  if (!Number.isInteger(year) || year < 2020 || year > 2100) notFound()

  const session = await requireSession()
  const results = await Promise.all(STATUSES.map((status) => getFiscalParams(session.user.id, year, status)))

  return (
    <FinanceShell title={`PARAMÈTRES FISCAUX ${year}`} eyebrow="Un jeu de paramètres par année et par statut">
      <div className="flex flex-col gap-8">
        <p className="max-w-2xl font-mono text-sm text-[var(--ink)]/70">
          Aucune valeur n&apos;est présumée : tant qu&apos;un paramètre n&apos;est pas renseigné ici, les écrans qui
          en dépendent l&apos;indiquent clairement plutôt que d&apos;afficher un chiffre inventé.
        </p>
        {STATUSES.map((status, index) => (
          <FiscalYearForm key={status} year={year} status={status} result={results[index]} />
        ))}
      </div>
    </FinanceShell>
  )
}
