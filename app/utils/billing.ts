const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })

/** dd/mm/aaaa in America/Sao_Paulo (same calendar the API uses for plan expiry). */
export function formatBillingDate(iso: string | null | undefined): string {
  return iso ? dateFormatter.format(new Date(iso)) : ''
}

/** Days until the annual expiry; negative once expired. */
export function daysUntil(iso: string | null | undefined): number {
  return iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0
}

/** Monthly checkout while the annual runs opens at D-7 (RN-08). */
export const MONTHLY_SWITCH_WINDOW_DAYS = 7
export const ANNUAL_RENEWAL_WINDOW_DAYS = 30

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })

/** dd/mm in America/Sao_Paulo. */
export function formatBillingDayMonth(iso: string | null | undefined): string {
  return iso ? shortDateFormatter.format(new Date(iso)) : ''
}

/** Links of the renewal CTAs, the same of the expiry e-mails (prd-pagamento-mercado-pago RF-B11). */
export const ANNUAL_RENEWAL_PATH = '/checkout?plano=anual'
export const PIX_RENEWAL_PATH = '/checkout?plano=mensal&metodo=pix'

const monthFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })

const capDayFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'short' })

/**
 * "1º/dez": the day the AI comes back after the subscriber's monthly cost cap (prd-teto-custo-assinante RF-W1), from
 * `resets_at` of the 402 or of /usage; without it, the 1st of next month in Brasília.
 */
export function costCapBackLabel(resetsAt?: string | null, now: Date = new Date()): string {
  let date = resetsAt ? new Date(resetsAt) : null
  if (!date || Number.isNaN(date.getTime())) {
    const [year = 0, month = 1] = monthFormatter.format(now).split('-').map(Number)
    // Noon UTC of the 1st is still the 1st in Brasília
    date = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 12))
  }
  const parts = capDayFormatter.formatToParts(date)
  const day = Number(parts.find(p => p.type === 'day')?.value)
  const name = (parts.find(p => p.type === 'month')?.value ?? '').replace('.', '')
  return `${day === 1 ? '1º' : day}/${name}`
}

/** "01/12": the 1st of next month in Brasília, the day the monthly count starts again (when /usage is not at hand). */
export function nextMonthStartLabel(now: Date = new Date()): string {
  const [, month] = monthFormatter.format(now).split('-').map(Number)
  const next = month === 12 ? 1 : (month ?? 0) + 1
  return `01/${String(next).padStart(2, '0')}`
}
