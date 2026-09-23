import { eq } from 'drizzle-orm'

import { FinanceShell } from '@/components/finance-shell'
import { OnboardingChecklist } from '@/components/settings/onboarding-checklist'
import { userPreferences } from '@/db/schema'
import { requireSession } from '@/lib/auth/session'
import { withCurrentUserScope } from '@/lib/db/scope'

export default async function OnboardingPage() {
  const session = await requireSession()
  const preferences = await withCurrentUserScope((tx) =>
    tx.query.userPreferences.findFirst({ where: eq(userPreferences.userId, session.user.id) }),
  )

  return (
    <FinanceShell title="PREMIÈRE CONFIGURATION" eyebrow="Reprenable à tout moment, jamais obligatoire">
      <OnboardingChecklist completedSteps={preferences?.onboardingCompletedSteps ?? []} />
    </FinanceShell>
  )
}
