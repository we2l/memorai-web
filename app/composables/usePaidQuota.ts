import type { FeatureLimitDetail } from '~/types'
import { isAtLimit, isNearLimit } from '~/utils/usageLimit'

/**
 * useFeatureUsage plus the paid plan's month (prd-uso-justo RF-F3, RN-3): the Intensivo has numeric monthly AI
 * quotas, with a line from 80% (LazyPlansUsageNotice) and, at the limit, the action disabled and the day the count
 * starts again, never the upgrade. Free and trial keep what they had (paid is false for them). Apart from
 * useFeatureUsage so the screens that only show the counts do not carry it.
 */
export function usePaidQuota() {
  const base = useFeatureUsage()
  const auth = useAuthStore()
  const { usage } = base

  /** The paid plan (Intensivo, not the trial): /usage says the tier; before it loads, the account's plan. */
  const paid = computed(() => (usage.value?.tier ? usage.value.tier === 'pro' : auth.user?.plan === 'pro'))

  /** /usage only for the paid plan: the screens that did not read it ask once, only for whom the line is. */
  async function fetchUsageIfPaid() {
    if (auth.user?.plan === 'pro') await base.fetchUsage()
  }

  function nearLimit(feature: string): boolean {
    return paid.value && isNearLimit(usage.value?.features?.[feature])
  }

  /** The paid plan spent the month's quota: the action stays disabled and the line says when it resets. */
  function atLimit(feature: string): boolean {
    return paid.value && isAtLimit(usage.value?.features?.[feature])
  }

  /** One more use done on this screen (a chat answer): the line follows without a new GET /usage. */
  function countUse(feature: string) {
    const f = usage.value?.features?.[feature]
    if (!f) return
    const remaining = f.remaining === null ? null : Math.max(0, f.remaining - 1)
    usage.value!.features[feature] = { used: f.used + 1, limit: f.limit, remaining }
  }

  /** The 402 detail a screen dispatches by itself: the paid plan gets the toast, not the upgrade (RN-3). */
  function limitDetail(feature: string): FeatureLimitDetail {
    const f = usage.value?.features?.[feature]
    return {
      feature,
      used: f?.used ?? null,
      limit: f?.limit ?? null,
      planRequired: paid.value ? null : 'pro',
      resetsAt: usage.value?.resets_at ?? null,
    }
  }

  return { ...base, paid, fetchUsageIfPaid, nearLimit, atLimit, countUse, limitDetail }
}
