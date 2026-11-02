/**
 * Words of the greeting on Hoje (prd-4a-hoje-v3 §5.1): salutation by the hour, the date in full and the
 * sentence of the day. The study day is Brasília's (the API counts streaks and limits there), so the
 * date and the day differences use America/Sao_Paulo; the salutation follows the person's own clock.
 */

export const STUDY_TZ = 'America/Sao_Paulo'

export function salutation(now: Date = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** "Rafael" from "Rafael Souza"; "estudante" without a name. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || 'estudante'
}

/** "Domingo, 1 de novembro" */
export function longDate(now: Date = new Date()): string {
  const text = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: STUDY_TZ }).format(now)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** AAAA-MM-DD of the study day (keys that reset at midnight in Brasília). */
export function studyDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STUDY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Whole study days between `iso` and now (0 = today, 1 = yesterday); null for an invalid date. */
export function daysAgo(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  const toUtcDay = (d: Date) => Date.parse(`${studyDay(d)}T00:00:00Z`)
  return Math.round((toUtcDay(now) - toUtcDay(then)) / 86_400_000)
}

/** "aberto hoje" / "aberto ontem" / "aberto há 3 dias" */
export function openedLabel(iso: string | null | undefined, now: Date = new Date()): string {
  const days = daysAgo(iso, now)
  if (days === null || days <= 0) return 'aberto hoje'
  if (days === 1) return 'aberto ontem'
  return `aberto há ${days} dias`
}

/** Minutes of the day, rounded to a multiple of 5 (at least 5). */
export function roundMinutes(minutes: number): number {
  return Math.max(5, Math.round(minutes / 5) * 5)
}

export type GreetingState = 'plan' | 'done' | 'new' | 'plain'

/**
 * The <h1> of Hoje. `plan`: there is something to review ("Hoje são uns 40 minutos."); `done`: cards and
 * nothing due; `new`: no card yet; `plain`: the salutation alone (loading the numbers failed).
 * Never "apenas": with a big number it reads as irony (auditoria 03 §5.3).
 */
export function greetingHeadline(state: GreetingState, name: string, minutes = 0, now: Date = new Date()): string {
  if (state === 'done') return `Tudo em dia, ${name}.`
  if (state === 'new') return `Que bom ter você aqui, ${name}.`
  const hello = `${salutation(now)}, ${name}.`
  return state === 'plan' ? `${hello} Hoje são uns ${roundMinutes(minutes)} minutos.` : hello
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
