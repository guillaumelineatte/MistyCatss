import { paramKeysForStatus, type FiscalParamKey } from '@/lib/fiscal/param-definitions'

/**
 * Valeurs par défaut des paramètres fiscaux pour l'année 2026 — TOUTES à
 * `null` volontairement (voir PROMPT.md « Interdiction d'inventer »). Ce
 * fichier documente la forme attendue ; la base (`fiscal_param_overrides`)
 * fait foi dès qu'une valeur y est saisie depuis les paramètres avancés.
 * Un nouveau fichier `<année>.ts` doit être ajouté chaque année, avec la
 * même forme.
 */
export const FISCAL_PARAMS_2026: Record<'micro' | 'eurl' | 'sasu', Partial<Record<FiscalParamKey, null>>> = {
  micro: Object.fromEntries(paramKeysForStatus('micro').map((key) => [key, null])),
  eurl: Object.fromEntries(paramKeysForStatus('eurl').map((key) => [key, null])),
  sasu: Object.fromEntries(paramKeysForStatus('sasu').map((key) => [key, null])),
}
