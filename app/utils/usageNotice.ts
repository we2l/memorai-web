import type { FeatureData } from '~/types'
import { formatBillingDayMonth, nextMonthStartLabel } from '~/utils/billing'
import { isAtLimit, isNearLimit } from '~/utils/usageLimit'

/*
 * Uso justo do Intensivo (prd-uso-justo RF-F3): the texts of the paid plan's monthly AI quotas, near and at the
 * limit. Pure, so the line under each AI action and the toast of the 402 say the same sentence. The checks
 * themselves are in utils/usageLimit (no import), for the screens that only disable an action.
 */

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
