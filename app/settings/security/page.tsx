import { headers } from 'next/headers'

import { FinanceShell } from '@/components/finance-shell'
import { SecuritySettings } from '@/components/settings/security-settings'
import { auth } from '@/lib/auth'
import { requireSession } from '@/lib/auth/session'

export default async function SecurityPage() {
  const session = await requireSession()
  const sessions = await auth.api.listSessions({ headers: await headers() })

  return (
    <FinanceShell title="SÉCURITÉ" eyebrow="Compte, sessions actives, double authentification">
      <SecuritySettings
        userName={session.user.name}
        userEmail={session.user.email}
        twoFactorEnabled={Boolean(session.user.twoFactorEnabled)}
        currentSessionId={session.session.id}
        initialSessions={sessions}
      />
    </FinanceShell>
  )
}
