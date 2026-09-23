import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'

import { FinanceShell } from '@/components/finance-shell'
import { GeneralSettings } from '@/components/settings/general-settings'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { companies, numberingSeries, statusPeriods, userPreferences } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'
import { onboardingCompletion } from '@/lib/onboarding/steps'

export default async function SettingsPage() {
  const session = await requireSession()

  const [company, periods, preferences, series] = await withCurrentUserScope((tx) =>
    Promise.all([
      tx.query.companies.findFirst({ where: eq(companies.userId, session.user.id) }),
      tx.select().from(statusPeriods).where(eq(statusPeriods.userId, session.user.id)).orderBy(desc(statusPeriods.startDate)),
      tx.query.userPreferences.findFirst({ where: eq(userPreferences.userId, session.user.id) }),
      tx.select().from(numberingSeries).where(eq(numberingSeries.userId, session.user.id)),
    ]),
  )

  const { done, total } = onboardingCompletion(preferences?.onboardingCompletedSteps)

  return (
    <FinanceShell title="PARAMÈTRES" eyebrow="Une seule configuration. La tienne." initialTheme={preferences?.theme}>
      <div className="flex flex-col gap-8">
        {done < total && (
          <Link
            href="/onboarding"
            className="flex items-center justify-between border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] px-4 py-3 font-mono text-xs uppercase"
          >
            <span>Configuration initiale : {done}/{total} étapes</span>
            <span className="underline">Reprendre</span>
          </Link>
        )}
        <GeneralSettings
          company={company ?? null}
          periods={periods}
          preferences={preferences ?? null}
          series={series}
        />
        <ThemeSwitcher />
      </div>
    </FinanceShell>
  )
}
