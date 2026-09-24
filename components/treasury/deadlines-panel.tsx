'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, SkipForward, Trash2 } from 'lucide-react'

import { ButtonPrimary, SectionLabel } from '@/components/finance-shell'
import { FormError, inputClassName } from '@/components/form/field'
import { useToast } from '@/components/ui/toast'
import type { deadlines as deadlinesTable } from '@/db/schema'
import {
  createDeadlineAction,
  deleteDeadlineAction,
  markDeadlineAction,
  restoreDeadlineAction,
  sendDeadlineReminderAction,
  type ActionResult,
} from '@/lib/deadlines/actions'
import { formatEuros } from '@/lib/money'

type Deadline = typeof deadlinesTable.$inferSelect

const kindLabels: Record<string, string> = { urssaf: 'URSSAF', tva: 'TVA', is: 'IS', cfe: 'CFE' }
const initialState: ActionResult = {}

export function DeadlinesPanel({ deadlines }: { deadlines: Deadline[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [state, formAction, pending] = useActionState(createDeadlineAction, initialState)
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    if (state.success) router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  const visible = deadlines.filter((d) => (showDone ? true : d.status === 'pending'))

  async function onMark(id: string, status: 'done' | 'skipped' | 'pending') {
    await markDeadlineAction(id, status)
    router.refresh()
  }

  async function onDelete(deadline: Deadline) {
    await deleteDeadlineAction(deadline.id)
    router.refresh()
    showToast({
      message: `Échéance ${kindLabels[deadline.kind]} du ${deadline.dueDate.split('-').reverse().join('/')} supprimée.`,
      action: {
        label: 'Annuler',
        onClick: async () => {
          await restoreDeadlineAction(deadline)
          router.refresh()
        },
      },
    })
  }

  async function onRemind(id: string) {
    await sendDeadlineReminderAction(id)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="pink">Calendrier</SectionLabel>
          <h2 className="text-3xl">ÉCHÉANCES</h2>
        </div>
        <button className="font-mono text-xs underline underline-offset-4" onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Masquer traitées' : 'Voir tout l\'historique'}
        </button>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        {state.error && <FormError message={state.error} />}
        <select name="kind" required className={`${inputClassName} mt-0 w-auto`} defaultValue="urssaf">
          <option value="urssaf">URSSAF</option>
          <option value="tva">TVA</option>
          <option value="is">IS</option>
          <option value="cfe">CFE</option>
        </select>
        <input name="dueDate" type="date" required className={`${inputClassName} mt-0 w-auto`} />
        <input name="amountEstimate" type="number" step="0.01" placeholder="Montant estimé — €" className={`${inputClassName} mt-0 w-auto`} />
        <ButtonPrimary>{pending ? 'Ajout…' : 'Ajouter'}</ButtonPrimary>
      </form>

      {visible.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucune échéance{showDone ? '' : ' à venir'}.</p>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-xs">
          {visible.map((deadline) => (
            <div key={deadline.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--ink)]/30 pb-3">
              <span className="border border-[var(--ink)] px-2 py-0.5">{kindLabels[deadline.kind]}</span>
              <span>{deadline.dueDate.split('-').reverse().join('/')}</span>
              <span className="flex-1 text-[var(--ink)]/60">
                {deadline.amountEstimateCents != null ? formatEuros(deadline.amountEstimateCents) : 'Montant non estimé'}
              </span>
              <span
                className={
                  deadline.status === 'done' ? 'text-[var(--blue)]' : deadline.status === 'skipped' ? 'text-[var(--ink)]/40' : ''
                }
              >
                {deadline.status === 'done' ? 'Traitée' : deadline.status === 'skipped' ? 'Ignorée' : 'En attente'}
              </span>
              {deadline.status === 'pending' && (
                <>
                  <button aria-label="Envoyer un rappel" onClick={() => onRemind(deadline.id)}>
                    <Bell className="size-4" />
                  </button>
                  <button aria-label="Marquer traitée" onClick={() => onMark(deadline.id, 'done')}>
                    <Check className="size-4" />
                  </button>
                  <button aria-label="Ignorer" onClick={() => onMark(deadline.id, 'skipped')}>
                    <SkipForward className="size-4" />
                  </button>
                </>
              )}
              <button aria-label="Supprimer l'échéance" onClick={() => onDelete(deadline)}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
