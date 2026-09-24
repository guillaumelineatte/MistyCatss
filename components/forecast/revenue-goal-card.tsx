'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { FormError, inputClassName } from '@/components/form/field'
import { setRevenueGoalAction, type ActionResult } from '@/lib/forecast/actions'
import { formatEuros } from '@/lib/money'

const initialState: ActionResult = {}

export function RevenueGoalCard({ goalCents, realizedCents }: { goalCents: number | null; realizedCents: number }) {
  const [state, formAction, pending] = useActionState(setRevenueGoalAction, initialState)
  const [editing, setEditing] = useState(goalCents == null)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme le formulaire après confirmation serveur, pas un état dérivable au rendu
      setEditing(false)
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  const percent = goalCents ? Math.min(100, Math.round((realizedCents / goalCents) * 100)) : 0

  return (
    <div className="border-[3px] border-[var(--ink)] bg-[var(--blue)] p-6 text-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Objectif {new Date().getFullYear()}</SectionLabel>
        {goalCents != null && !editing && (
          <button className="font-mono text-xs underline" onClick={() => setEditing(true)}>
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="mt-6 flex flex-wrap items-end gap-3">
          {state.error && <FormError message={state.error} />}
          <input
            name="annualGoal"
            type="number"
            step="100"
            min="0"
            required
            defaultValue={goalCents != null ? goalCents / 100 : ''}
            placeholder="Objectif de CA annuel — €"
            className={`${inputClassName} mt-0 bg-[var(--paper)] text-[var(--ink)]`}
          />
          <ButtonPrimary>{pending ? 'Enregistrement…' : 'Enregistrer'}</ButtonPrimary>
          {goalCents != null && <ButtonSecondary onClick={() => setEditing(false)}>Annuler</ButtonSecondary>}
        </form>
      ) : (
        <>
          <h2 className="mt-6 text-7xl md:text-9xl">
            {formatEuros(realizedCents)}
            <br />
            <span className="text-[var(--pink)]">RÉALISÉS.</span>
          </h2>
          <div className="mt-8 flex justify-between font-mono text-xs">
            <span>{formatEuros(realizedCents)} encaissés</span>
            <span>{formatEuros(goalCents ?? 0)} objectif</span>
          </div>
          <div className="mt-3 h-8 border-2 border-[var(--paper)] p-1">
            <div className="h-full bg-[var(--pink)]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-4 font-mono text-sm">
            {goalCents != null && goalCents > realizedCents
              ? `Il te reste ${formatEuros(goalCents - realizedCents)}.`
              : goalCents != null
                ? 'Objectif atteint.'
                : ''}
          </p>
        </>
      )}
    </div>
  )
}
