import 'server-only'

import { and, eq } from 'drizzle-orm'

import { fiscalParamOverrides } from '@/db/schema'
import type { StatutJuridique } from '@/db/schema'
import { FISCAL_PARAM_DEFINITIONS_BY_KEY, paramKeysForStatus, type FiscalParamKey } from '@/lib/fiscal/param-definitions'
import { withUserScope } from '@/lib/db/scope'

export type FiscalParamsResult =
  | {
      status: 'ok'
      year: number
      statutJuridique: StatutJuridique
      values: Record<FiscalParamKey, number>
    }
  | {
      status: 'missing_params'
      year: number
      statutJuridique: StatutJuridique
      values: Partial<Record<FiscalParamKey, number>>
      missing: { key: FiscalParamKey; label: string }[]
    }

/**
 * Résout les paramètres fiscaux d'un utilisateur pour une année et un statut
 * donnés : la base (fiscal_param_overrides) fait foi, lib/fiscal/params/*.ts
 * ne sert que de documentation de la forme attendue. Ne lève JAMAIS
 * d'exception et ne retombe JAMAIS sur une valeur par défaut : renvoie un
 * résultat typé explicite que l'interface sait afficher (bandeau "paramètre
 * manquant"), cf. PROMPT.md « Comportement en l'absence de paramètre ».
 */
export async function getFiscalParams(
  userId: string,
  year: number,
  statutJuridique: StatutJuridique,
): Promise<FiscalParamsResult> {
  const requiredKeys = paramKeysForStatus(statutJuridique)

  const rows = await withUserScope(userId, (tx) =>
    tx
      .select()
      .from(fiscalParamOverrides)
      .where(
        and(
          eq(fiscalParamOverrides.year, year),
          eq(fiscalParamOverrides.status, statutJuridique),
        ),
      ),
  )

  const values: Partial<Record<FiscalParamKey, number>> = {}
  for (const row of rows) {
    if (requiredKeys.includes(row.paramKey as FiscalParamKey)) {
      values[row.paramKey as FiscalParamKey] = Number(row.value)
    }
  }

  const missingKeys = requiredKeys.filter((key) => values[key] === undefined)

  if (missingKeys.length > 0) {
    return {
      status: 'missing_params',
      year,
      statutJuridique,
      values,
      missing: missingKeys.map((key) => ({ key, label: FISCAL_PARAM_DEFINITIONS_BY_KEY[key].label })),
    }
  }

  return {
    status: 'ok',
    year,
    statutJuridique,
    values: values as Record<FiscalParamKey, number>,
  }
}
