import type { FeatureData, FeatureLimitDetail } from '~/types'
import { formatBillingDayMonth } from '~/utils/billing'

/**
 * Uso justo do Intensivo (prd-uso-justo RF-F3, RN-2): the monthly AI quotas of the paid plan, near and at the
 * limit. Pure, so the line under each AI action and the toast of the 402 say the same sentence.
 */
export const NEAR_LIMIT_RATIO = 0.8

/** `near_limit` of /usage; an older API without it: limit > 0 and used >= ceil(limit × 0,8). */
export function isNearLimit(f: FeatureData | null | undefined): boolean {
  if (!f || !f.limit || f.limit <= 0) return false
  if (typeof f.near_limit === 'boolean') return f.near_limit
  return f.used >= Math.ceil(f.limit * NEAR_LIMIT_RATIO)
}

/** At the limit: a numeric quota with nothing left. */
export function isAtLimit(f: FeatureData | null | undefined): boolean {
  if (!f || !f.limit || f.limit <= 0) return false
  return (f.remaining ?? Math.max(0, f.limit - f.used)) <= 0
}

const monthFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' })

/** "01/12": the 1st of next month in Brasília, the day the monthly count starts again (when /usage is not at hand). */
export function nextMonthStartLabel(now: Date = new Date()): string {
  const [, month] = monthFormatter.format(now).split('-').map(Number)
  const next = month === 12 ? 1 : (month ?? 0) + 1
  return `01/${String(next).padStart(2, '0')}`
}

/** "Você usou 400 de 400 gerações de cards com IA deste mês. A contagem recomeça em 01/12." */
export function limitReachedText(used: number | null | undefined, limit: number | null | undefined, label: string, resetsAt: string | null | undefined): string {
  const date = formatBillingDayMonth(resetsAt)
  const reset = `A contagem recomeça em ${date || nextMonthStartLabel()}.`
  const spent = used != null && limit ? `Você usou ${used} de ${limit} ${label} deste mês.` : `Você chegou ao limite de ${label} deste mês.`
  return `${spent} ${reset}`
}

export interface UsageNotice {
  kind: 'near' | 'limit'
  text: string
}

/**
 * The line of the paid plan where the AI action happens: "Restam 79 de 400 gerações de cards com IA este mês."
 * from 80%, the limit sentence at 0. Null below 80% and without a numeric quota.
 */
export function usageNotice(f: FeatureData | null | undefined, label: string, resetsAt: string | null | undefined): UsageNotice | null {
  if (!f || !f.limit || f.limit <= 0) return null
  if (isAtLimit(f)) return { kind: 'limit', text: limitReachedText(Math.max(f.used, f.limit), f.limit, label, resetsAt) }
  if (!isNearLimit(f)) return null
  const left = f.remaining ?? Math.max(0, f.limit - f.used)
  return { kind: 'near', text: `${left === 1 ? 'Resta' : 'Restam'} ${left} de ${f.limit} ${label} este mês.` }
}

/** The same, short, for a menu item's meta: "restam 9 este mês" or "recomeça em 01/12". */
export function usageNoticeShort(f: FeatureData | null | undefined, resetsAt: string | null | undefined): string | null {
  if (!f || !f.limit || f.limit <= 0) return null
  if (isAtLimit(f)) {
    return `recomeça em ${formatBillingDayMonth(resetsAt) || nextMonthStartLabel()}`
  }
  if (!isNearLimit(f)) return null
  const left = f.remaining ?? Math.max(0, f.limit - f.used)
  return `${left === 1 ? 'resta' : 'restam'} ${left} este mês`
}

/**
 * The 402 of a paid account (plan_required null) is a toast, never the upgrade modal (RF-F4, RN-3). Free and
 * trial (plan_required "pro", or absent: the old payload) keep the modal.
 */
export function limitReachedRoute(detail: Partial<FeatureLimitDetail>): 'toast' | 'modal' {
  return detail.planRequired === null ? 'toast' : 'modal'
}
