import { COMMON_COMPROMISED_PASSWORDS } from './common-passwords'

export const MIN_PASSWORD_LENGTH = 12

export type PasswordPolicyError = 'too_short' | 'too_common'

/**
 * Vérifie la politique de mot de passe : longueur minimale + présence dans
 * une liste locale de mots de passe compromis/trop communs. Volontairement
 * hors ligne (voir lib/auth/common-passwords.ts) : aucune donnée saisie par
 * l'utilisateur ne quitte le serveur pour cette vérification.
 */
export function checkPasswordPolicy(password: string): PasswordPolicyError | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too_short'
  if (COMMON_COMPROMISED_PASSWORDS.has(password.toLowerCase())) return 'too_common'
  return null
}

export const passwordPolicyMessages: Record<PasswordPolicyError, string> = {
  too_short: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  too_common: 'Ce mot de passe est trop courant ou a été vu dans des fuites de données. Choisis-en un autre.',
}
