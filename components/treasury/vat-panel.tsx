'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { statusPeriods as statusPeriodsTable, vatPeriods as vatPeriodsTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { deleteVatPeriodAction, markVatPeriodFiledAction, prepareVatPeriodAction, type ActionResult } from '@/lib/vat/actions'

type VatPeriod = typeof vatPeriodsTable.$inferSelect
type StatusPeriod = typeof statusPeriodsTable.$inferSelect

const vatRegimeLabels = { franchise: 'Franchise en base', reel_simplifie: 'Réel simplifié', reel_normal: 'Réel normal' } as const
const statusLabels = { draft: 'Brouillon', prepared: 'Préparée', filed: 'Télédéclarée' } as const
const initialState: ActionResult = {}

export function VatPanel({ periods, statusPeriod }: { periods: VatPeriod[]; statusPeriod: StatusPeriod | null }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(prepareVatPeriodAction, initialState)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.success) {
      router.refresh()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme le formulaire après confirmation serveur, pas un état dérivable au rendu
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  async function onMarkFiled(id: string) {
    await markVatPeriodFiledAction(id)
    router.refresh()
  }

  async function onDelete(id: string) {
    if (!confirm('Supprimer cette déclaration préparée ?')) return
    const result = await deleteVatPeriodAction(id)
    if (result.error) alert(result.error)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="blue">TVA</SectionLabel>
          <h2 className="text-3xl">DÉCLARATIONS DE TVA</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase text-[var(--ink)]/60">
            Régime en vigueur : {statusPeriod ? vatRegimeLabels[statusPeriod.vatRegime] : 'non renseigné'}
          </span>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/vat/export">
            <ButtonSecondary>
              <Download className="size-4" /> Export CSV
            </ButtonSecondary>
          </a>
          <ButtonPrimary onClick={() => setOpen((v) => !v)}>{open ? 'Annuler' : 'Préparer une déclaration'}</ButtonPrimary>
        </div>
      </div>

      {open && (
        <form action={formAction} className="flex flex-wrap items-end gap-3 border-2 border-[var(--ink)] p-4">
          {state.error && <FormError message={state.error} />}
          <Field label="Début de période" htmlFor="periodStart">
            <input id="periodStart" name="periodStart" type="date" required className={inputClassName} />
          </Field>
          <Field label="Fin de période" htmlFor="periodEnd">
            <input id="periodEnd" name="periodEnd" type="date" required className={inputClassName} />
          </Field>
          <Field label="TVA déductible — €" htmlFor="deductible">
            <input id="deductible" name="deductible" type="number" step="0.01" defaultValue={0} className={inputClassName} />
          </Field>
          <ButtonPrimary>{pending ? 'Préparation…' : 'Calculer'}</ButtonPrimary>
        </form>
      )}
      <p className="font-mono text-[11px] text-[var(--ink)]/50">
        La TVA collectée est recalculée depuis les factures émises sur la période. La TVA déductible se saisit manuellement (aucun taux
        de TVA capturé sur les dépenses pour l&apos;instant).
      </p>

      {periods.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucune déclaration préparée.</p>
      ) : (
        <div className="flex flex-col gap-2 font-mono text-xs">
          {periods.map((period) => (
            <div key={period.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--ink)]/30 pb-3">
              <span>
                {period.periodStart.split('-').reverse().join('/')} → {period.periodEnd.split('-').reverse().join('/')}
              </span>
              <span className="text-[var(--ink)]/60">Collectée {formatEuros(period.collectedCents)}</span>
              <span className="text-[var(--ink)]/60">Déductible {formatEuros(period.deductibleCents)}</span>
              <span className="font-bold">Solde {formatEuros(period.collectedCents - period.deductibleCents)}</span>
              <span className={period.status === 'filed' ? 'text-[var(--blue)]' : ''}>{statusLabels[period.status]}</span>
              {period.status === 'prepared' && (
                <>
                  <button className="underline" onClick={() => onMarkFiled(period.id)}>
                    Marquer télédéclarée
                  </button>
                  <button className="underline" onClick={() => onDelete(period.id)}>
                    Supprimer
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
