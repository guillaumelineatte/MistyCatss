import Link from 'next/link'
import { CircleAlert } from 'lucide-react'

/**
 * Encart sobre affiché partout où un calcul ne peut pas se faire faute de
 * paramètre fiscal renseigné (PROMPT.md « Comportement en l'absence de
 * paramètre ») : le reste de l'écran continue de fonctionner normalement.
 */
export function MissingParamBanner({
  missing,
  year,
}: {
  missing: { key: string; label: string }[]
  year: number
}) {
  if (missing.length === 0) return null

  return (
    <div className="flex flex-col gap-2 border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] p-4">
      <div className="flex items-center gap-2">
        <CircleAlert className="size-4 shrink-0" />
        <p className="font-mono text-xs uppercase tracking-[.1em]">Estimation indisponible</p>
      </div>
      <p className="font-mono text-xs text-[var(--ink)]/70">
        Paramètre{missing.length > 1 ? 's' : ''} manquant{missing.length > 1 ? 's' : ''} pour {year} :{' '}
        {missing.map((item) => item.label).join(', ')}.
      </p>
      <Link href={`/settings/fiscal/${year}`} className="font-mono text-xs underline underline-offset-4">
        Renseigner dans les paramètres fiscaux
      </Link>
    </div>
  )
}
