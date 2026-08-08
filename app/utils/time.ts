/**
 * Returns a human-friendly relative date string in PT-BR.
 */
export function relativeDate(date: string | null | undefined): string {
  if (!date) return ''

  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  if (diffDays < 14) return '1 semana atrás'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`
  if (diffDays < 60) return '1 mês atrás'
  return `${Math.floor(diffDays / 30)} meses atrás`
}
