const MONTH_LABELS = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE']

export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Sélecteur de période du tableau de bord : les 12 derniers mois réels, jamais des libellés figés. */
export function recentMonthOptions(count = 12): { value: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    return { value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
  })
}
