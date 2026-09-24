'use client'

import { useState } from 'react'

/**
 * Confirmation forte (saisie d'un mot de passage) pour une action
 * destructrice/irréversible — PROMPT.md « confirmations fortes (saisie du
 * nom) pour les actions destructrices ». Réservée aux actions à
 * conséquence réelle et difficile à défaire (ex. annulation de facture
 * émise, suppression de compte/client). Les suppressions réversibles ou à
 * faible enjeu (catégorie, échéance…) utilisent plutôt un toast avec
 * annulation (voir components/ui/toast.tsx), pas cette confirmation.
 */
export function StrongConfirm({
  title,
  warning,
  promptLabel,
  matchValue,
  confirmLabel,
  onConfirm,
  error,
}: {
  title: string
  warning: string
  promptLabel: string
  matchValue: string
  confirmLabel: string
  onConfirm: () => void
  error?: string | null
}) {
  const [value, setValue] = useState('')

  return (
    <div className="border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-5">
      <h3 className="text-xl">{title}</h3>
      <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">{warning}</p>
      {error && <p className="mt-2 font-mono text-xs text-[var(--pink)]">{error}</p>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="font-mono text-xs uppercase">
          {promptLabel}
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-2 block h-11 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 font-mono text-sm outline-none"
          />
        </label>
        <button
          onClick={onConfirm}
          disabled={value !== matchValue}
          className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--pink)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
