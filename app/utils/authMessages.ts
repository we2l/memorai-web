/**
 * Messages of the auth screens (prd-4g-conta-onboarding-v3 RF-F12..F14), kept apart so they can be tested and
 * so no screen tells whether an e-mail has an account.
 */
import { getErrorStatus } from '~/utils/apiErrors'

export const MIN_PASSWORD = 8

/** Seconds of the Retry-After of a 429 (null when absent or unreadable; the API must expose the header). */
export function retryAfterSeconds(e: unknown): number | null {
  const raw = (e as { response?: { headers?: Headers } })?.response?.headers?.get?.('retry-after')
  const seconds = Number(raw)
  return raw && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null
}

/** "1 minuto", "2 minutos" or "45 segundos" */
export function waitLabel(seconds: number | null): string {
  if (seconds === null) return '1 minuto'
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

/** Login: the failure never says which of the two was wrong (RN 6). */
export function loginErrorMessage(e: unknown): string {
  const status = getErrorStatus(e)
  if (status === 429) return `Muitas tentativas. Tente de novo em ${waitLabel(retryAfterSeconds(e))}.`
  if (status === 422) return 'E-mail ou senha incorretos.'
  // Account being deleted: the API says what to do, a generic "try again" would never end
  if (status === 403) return (e as { data?: { message?: string } })?.data?.message || 'Esta conta não pode entrar agora.'
  return 'Não foi possível entrar agora. Tente de novo.'
}

/** First message of each field of a 422 ({ errors: { field: [message] } }). */
export function fieldErrors(e: unknown): Record<string, string> {
  const errors = (e as { data?: { errors?: Record<string, string[]> } })?.data?.errors ?? {}
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, v[0] ?? '']))
}

/** Hint of the new password, in text: never a colored meter alone. */
export function passwordHint(password: string): string {
  if (!password) return `Pelo menos ${MIN_PASSWORD} caracteres.`
  if (password.length < MIN_PASSWORD) {
    const missing = MIN_PASSWORD - password.length
    return missing === 1 ? 'Falta 1 caractere.' : `Faltam ${missing} caracteres.`
  }
  const kinds = [/[a-zà-ÿ]/, /[A-ZÀ-Ÿ]/, /\d/, /[^\p{L}\d]/u].filter(r => r.test(password)).length
  if (password.length >= 12 && kinds >= 2) return 'Senha forte.'
  if (kinds >= 2) return 'Senha boa. Mais longa fica ainda mais segura.'
  return 'Senha fraca: misture letras e números.'
}
