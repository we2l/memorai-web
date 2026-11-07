import type { FeatureData, FeatureLimitDetail } from '~/types'

/**
 * Uso justo do Intensivo (prd-uso-justo RN-2): near and at the monthly limit, with no import, so the screens that
 * only disable an action do not carry the texts (utils/usageNotice) into their chunk.
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

/**
 * The 402 of a paid account (plan_required null) is a toast, never the upgrade modal (RF-F4, RN-3). Free and
 * trial (plan_required "pro", or absent: the old payload) keep the modal.
 */
export function limitReachedRoute(detail: Partial<FeatureLimitDetail>): 'toast' | 'modal' {
  return detail.planRequired === null ? 'toast' : 'modal'
}
