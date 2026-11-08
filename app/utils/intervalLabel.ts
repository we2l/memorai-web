/**
 * The interval labels of the API ("10min", "2d", "1.5m") read as Portuguese: the review's feedback after each rating
 * (prd-revisao-v5-fase-a RF-F4) and the visitor's result. Pure.
 */

/** "10min" → "em 10 min", "8d" → "em 8 dias", "1d" → "amanhã", "1.5m" → "em 1,5 mês" (the API's labels). */
export function returnText(label: string): string {
  if (label.trim().startsWith('<')) return 'hoje'
  const m = /^([\d.]+)(min|h|d|m|a)$/.exec(label.trim())
  if (!m) return label
  const n = Number(m[1])
  const num = String(n).replace('.', ',')
  switch (m[2]) {
    case 'min': return `em ${num} min`
    case 'h': return `em ${num} h`
    case 'd': return n === 1 ? 'amanhã' : `em ${num} dias`
    case 'm': return n === 1 ? 'em 1 mês' : `em ${num} meses`
    default: return n === 1 ? 'em 1 ano' : `em ${num} anos`
  }
}

/** The feedback after a rating: "Lembrei · volta em 2 dias", "Não lembrei · volta amanhã". */
export function feedbackText(label: string, interval: string): string {
  const when = returnText(interval)
  return when ? `${label} · volta ${when}` : label
}
