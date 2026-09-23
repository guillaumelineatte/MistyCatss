'use client'

import { useActionState } from 'react'

import { ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { StatutJuridique } from '@/db/schema'
import { FISCAL_PARAM_DEFINITIONS_BY_KEY, paramKeysForStatus } from '@/lib/fiscal/param-definitions'
import type { FiscalParamsResult } from '@/lib/fiscal/get-params'
import { upsertFiscalParamsAction, type ActionResult } from '@/lib/settings/actions'

const statusLabels: Record<StatutJuridique, string> = { micro: 'Micro-entreprise', eurl: 'EURL', sasu: 'SASU' }

const initialState: ActionResult = {}

export function FiscalYearForm({
  year,
  status,
  result,
}: {
  year: number
  status: StatutJuridique
  result: FiscalParamsResult
}) {
  const [state, action, pending] = useActionState(upsertFiscalParamsAction, initialState)
  const keys = paramKeysForStatus(status)
  const missingKeys = new Set(result.status === 'missing_params' ? result.missing.map((m) => m.key) : [])

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
        <div>
          <SectionLabel tone={result.status === 'missing_params' ? 'pink' : 'blue'}>
            {statusLabels[status]}
          </SectionLabel>
          <h2 className="mt-4 text-3xl">
            {result.status === 'missing_params' ? `${result.missing.length} paramètre(s) manquant(s)` : 'Complet'}
          </h2>
        </div>
        <ButtonSecondary>{pending ? 'Enregistrement…' : 'Enregistrer'}</ButtonSecondary>
      </div>
      <form action={action} className="contents">
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="status" value={status} />
        {state.error && <div className="mt-5"><FormError message={state.error} /></div>}
        {state.success && <p className="mt-5 font-mono text-xs text-[var(--blue)]">Enregistré.</p>}
        <div className="grid gap-5 py-6 md:grid-cols-2">
          {keys.map((key) => {
            const definition = FISCAL_PARAM_DEFINITIONS_BY_KEY[key]
            const value = result.values[key]
            // 100 centimes = 1 € ; 100 points de base = 1 % — même conversion.
            const displayValue = value != null ? value / 100 : ''
            return (
              <Field
                key={key}
                label={`${definition.label} (${definition.unit === 'cents' ? '€' : '%'})`}
                htmlFor={`param__${key}`}
                error={missingKeys.has(key) ? 'Non renseigné' : undefined}
              >
                <input
                  id={`param__${key}`}
                  name={`param__${key}`}
                  type="number"
                  step="0.01"
                  defaultValue={displayValue}
                  className={inputClassName}
                />
                <p className="mt-1 font-mono text-[11px] text-[var(--ink)]/50">{definition.description}</p>
              </Field>
            )
          })}
        </div>
      </form>
    </div>
  )
}
