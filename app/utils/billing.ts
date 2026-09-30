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

/** Link used by the renewal CTAs and the expiry e-mails. */
export const ANNUAL_RENEWAL_PATH = '/planos?ciclo=anual&renovar=1'
