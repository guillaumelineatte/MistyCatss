'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

import { inputClassName } from '@/components/form/field'
import { computeDocumentTotals } from '@/lib/money'

export type LineDraft = {
  description: string
  quantity: number
  unitPriceCents: number
  discountPercentBasisPoints: number | null
  vatRateBasisPoints: number
}

const emptyLine = (): LineDraft => ({
  description: '',
  quantity: 1,
  unitPriceCents: 0,
  discountPercentBasisPoints: null,
  vatRateBasisPoints: 2000,
})

export function QuoteLineEditor({ initialLines }: { initialLines?: LineDraft[] }) {
  const [lines, setLines] = useState<LineDraft[]>(initialLines?.length ? initialLines : [emptyLine()])

  const totals = useMemo(() => computeDocumentTotals(lines.filter((l) => l.description)), [lines])

  function update(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function move(index: number, direction: -1 | 1) {
    setLines((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function remove(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="hidden gap-3 border-b-2 border-[var(--ink)] pb-2 font-mono text-[10px] uppercase text-[var(--ink)]/60 md:grid md:grid-cols-[3fr_1fr_1fr_1fr_1fr_auto]">
        <span>Description</span>
        <span>Qté</span>
        <span>PU HT (€)</span>
        <span>Remise (%)</span>
        <span>TVA (%)</span>
        <span />
      </div>
      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 border-2 border-[var(--ink)] p-3 md:grid-cols-[3fr_1fr_1fr_1fr_1fr_auto] md:items-center md:border-0 md:border-b md:border-[var(--ink)]/30 md:p-0 md:pb-3">
          <input
            aria-label="Description de la ligne"
            value={line.description}
            onChange={(e) => update(index, { description: e.target.value })}
            placeholder="Description de la prestation"
            className={inputClassName}
          />
          <input
            aria-label="Quantité"
            type="number"
            step="0.5"
            min="0"
            value={line.quantity}
            onChange={(e) => update(index, { quantity: Number(e.target.value) })}
            className={inputClassName}
          />
          <input
            aria-label="Prix unitaire HT en euros"
            type="number"
            step="0.01"
            value={line.unitPriceCents / 100}
            onChange={(e) => update(index, { unitPriceCents: Math.round(Number(e.target.value) * 100) })}
            className={inputClassName}
          />
          <input
            aria-label="Remise en pourcentage"
            type="number"
            step="0.1"
            value={line.discountPercentBasisPoints != null ? line.discountPercentBasisPoints / 100 : ''}
            onChange={(e) => update(index, { discountPercentBasisPoints: e.target.value ? Math.round(Number(e.target.value) * 100) : null })}
            className={inputClassName}
          />
          <input
            aria-label="Taux de TVA en pourcentage"
            type="number"
            step="0.1"
            value={line.vatRateBasisPoints / 100}
            onChange={(e) => update(index, { vatRateBasisPoints: Math.round(Number(e.target.value) * 100) })}
            className={inputClassName}
          />
          <div className="flex gap-1 justify-self-end">
            <button type="button" onClick={() => move(index, -1)} aria-label="Monter" className="border-2 border-[var(--ink)] p-2">
              <ArrowUp className="size-3" />
            </button>
            <button type="button" onClick={() => move(index, 1)} aria-label="Descendre" className="border-2 border-[var(--ink)] p-2">
              <ArrowDown className="size-3" />
            </button>
            <button type="button" onClick={() => remove(index)} aria-label="Supprimer la ligne" className="border-2 border-[var(--ink)] p-2 hover:bg-[var(--pink)]">
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLines((prev) => [...prev, emptyLine()])}
        className="self-start border-2 border-dashed border-[var(--ink)] px-3 py-2 font-mono text-xs uppercase"
      >
        + Ajouter une ligne
      </button>

      <div className="mt-2 flex flex-col items-end gap-1 border-t-2 border-[var(--ink)] pt-3 font-mono text-sm">
        <span>HT : {(totals.totalHtCents / 100).toLocaleString('fr-FR')} €</span>
        <span>TVA : {(totals.totalVatCents / 100).toLocaleString('fr-FR')} €</span>
        <span className="font-anton text-2xl">TTC : {(totals.totalTtcCents / 100).toLocaleString('fr-FR')} €</span>
      </div>
    </div>
  )
}
