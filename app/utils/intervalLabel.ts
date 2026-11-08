/**
 * The interval labels of the API ("10min", "2d", "1.5m") read as Portuguese: the review's feedback after each rating
 * (prd-revisao-v5-fase-a RF-F4) and the visitor's result. Pure.
 */

/**
 * The one reading of an API interval label in Portuguese (ratings, feedback, end of a lote, the visitor's agenda):
 * "10min" → "em 10 min", "1d" → "amanhã", "2d" → "em 2 dias", "1.3m" → "em 40 dias", "2.5m" → "em 3 meses",
 * "1.2a" → "em 1 ano", "< 1d" → "hoje". The API writes months as days / 30 and years as days / 365 (one decimal):
 * they turn back into days and are said in days up to ~45 days, in months up to a year, then in years. Above 30
 * days the count goes to the nearest 5 (a month written with one decimal is not exact to the day).
 */
export function returnText(label: string): string {
  const raw = label.trim()
  if (raw.startsWith('<')) return 'hoje'
  const m = /^([\d.]+)\s*(min|h|d|m|a)$/.exec(raw)
  if (!m) return label
  const n = Number(m[1])
  if (m[2] === 'min') return `em ${fmt(n)} min`
  if (m[2] === 'h') return `em ${fmt(n)} h`
  const days = Math.round(n * ({ d: 1, m: 30, a: 365 } as const)[m[2] as 'd' | 'm' | 'a'])
  if (days <= 0) return 'hoje'
  if (days === 1) return 'amanhã'
  if (days <= 30) return `em ${days} dias`
  if (days <= 45) return `em ${Math.round(days / 5) * 5} dias`
  if (days < 365) {
    const months = Math.max(2, Math.round(days / 30))
    return months >= 12 ? 'em 1 ano' : `em ${months} meses`
  }
  const years = Math.round(days / 365)
  return years <= 1 ? 'em 1 ano' : `em ${years} anos`
}

function fmt(n: number): string {
  return String(n).replace('.', ',')
}

/** The feedback after a rating: "Lembrei · volta em 2 dias", "Não lembrei · volta amanhã". */
export function feedbackText(label: string, interval: string): string {
  const when = returnText(interval)
  return when ? `${label} · volta ${when}` : label
}
