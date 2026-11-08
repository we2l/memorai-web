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

/** "01/12": the 1st of next month in Brasília, the day the monthly count starts again (when /usage is not at hand). */
export function nextMonthStartLabel(now: Date = new Date()): string {
  const [, month] = monthFormatter.format(now).split('-').map(Number)
  const next = month === 12 ? 1 : (month ?? 0) + 1
  return `01/${String(next).padStart(2, '0')}`
}
