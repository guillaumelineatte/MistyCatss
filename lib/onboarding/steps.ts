export type OnboardingStep = {
  id: string
  label: string
  description: string
  href: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'company', label: 'Informations entreprise', description: 'Raison sociale, SIRET, adresse, coordonnées bancaires.', href: '/settings#entreprise' },
  { id: 'status', label: 'Statut juridique et date de début', description: 'Micro-entreprise, EURL ou SASU, et régime de TVA.', href: '/settings#statut' },
  { id: 'numbering', label: 'Séries de numérotation', description: 'Préfixe et format des factures et devis.', href: '/settings#numerotation' },
  { id: 'preferences', label: 'TJM et conditions par défaut', description: 'Taux journalier moyen, délai de paiement.', href: '/settings#preferences' },
  { id: 'fiscal', label: "Paramètres fiscaux de l'année", description: 'Taux de cotisations, seuils, TVA.', href: `/settings/fiscal/${new Date().getFullYear()}` },
]

export function onboardingCompletion(completedSteps: string[] | null | undefined) {
  const set = new Set(completedSteps ?? [])
  const done = ONBOARDING_STEPS.filter((step) => set.has(step.id) || set.has(`${step.id}:skipped`))
  return { done: done.length, total: ONBOARDING_STEPS.length, set }
}
