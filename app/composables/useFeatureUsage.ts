import type { FeatureLimitDetail, FeatureUsageData } from '~/types'
import { isAtLimit, isNearLimit, usageNotice, usageNoticeShort, type UsageNotice } from '~/utils/usageNotice'

export function useFeatureUsage() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()
  const { plans } = usePlans()
  const usage = ref<FeatureUsageData | null>(null)
  const loading = ref(false)

  async function fetchUsage() {
    loading.value = true
    try {
      const res = await $api<{ data: FeatureUsageData }>('/usage')
      usage.value = res.data
    } catch (e) {
      // Usage is decorative (RF-F3b: S)
      reportApiError(e, { silent: true })
    } finally {
      loading.value = false
    }
  }

  /**
   * The Free quota is 0, but the click of an account whose trial is available reaches the server, which opens
   * the trial (prd-planos-lancamento RF-F7b). Not for what the trial leaves out (the podcast).
   */
  function opensTrial(feature: string): boolean {
    if (!auth.opensTrialOnUse) return false
    const excludes = offeredTrial(plans.value)?.excludes ?? ['podcast']
    return !excludes.includes(feature)
  }

  function canUse(feature: string): boolean {
    if (!usage.value || opensTrial(feature)) return true
    const f = usage.value.features?.[feature]
    if (!f || f.limit === null) return true
    return f.remaining !== null && f.remaining > 0
  }

  function remaining(feature: string): number | null {
    if (!usage.value) return null
    return usage.value.features?.[feature]?.remaining ?? null
  }

  function isLimited(feature: string): boolean {
    if (!usage.value) return false
    const f = usage.value.features?.[feature]
    return f?.limit !== null && f?.limit !== undefined
  }

  /**
   * The paid plan (Intensivo, not the trial): its monthly quotas have the 80% line and the limit sentence
   * (prd-uso-justo RF-F3). Free and trial keep what they had.
   */
  const paid = computed(() => (usage.value?.tier ? usage.value.tier === 'pro' : auth.user?.plan === 'pro'))

  /** /usage only for the paid plan: the screens that did not read it ask once, only for whom the line is. */
  async function fetchUsageIfPaid() {
    if (auth.user?.plan === 'pro') await fetchUsage()
  }

  function nearLimit(feature: string): boolean {
    return paid.value && isNearLimit(usage.value?.features?.[feature])
  }

  /** The paid plan spent the month's quota: the action stays disabled and the line says when it resets. */
  function atLimit(feature: string): boolean {
    return paid.value && isAtLimit(usage.value?.features?.[feature])
  }

  function notice(feature: string): UsageNotice | null {
    if (!paid.value || !usage.value) return null
    const label = plans.value?.features?.[feature]?.label ?? 'usos com IA'
    return usageNotice(usage.value.features?.[feature], label, usage.value.resets_at ?? null)
  }

  /** The short form for a menu item ("restam 9 este mês", "recomeça em 01/12"). */
  function noticeShort(feature: string): string | null {
    if (!paid.value || !usage.value) return null
    return usageNoticeShort(usage.value.features?.[feature], usage.value.resets_at ?? null)
  }

  /** One more use done on this screen (a chat answer): the line follows without a new GET /usage. */
  function countUse(feature: string) {
    const f = usage.value?.features?.[feature]
    if (!f) return
    const used = f.used + 1
    const remaining = f.remaining === null ? null : Math.max(0, f.remaining - 1)
    usage.value!.features[feature] = { used, limit: f.limit, remaining }
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

  /** The period of the counts: the trial's 7 days or the calendar month. */
  const periodLabel = computed(() => (usage.value?.tier === 'trial' ? 'no teste' : 'este mês'))

  // The trial opened (or ended) under this screen: the quotas change with it
  watch(() => auth.user?.trial?.status, (now, before) => {
    if (before && now !== before && usage.value) void fetchUsage()
  })

  return { usage, loading, fetchUsage, fetchUsageIfPaid, canUse, remaining, isLimited, opensTrial, periodLabel, paid, nearLimit, atLimit, notice, limitDetail, countUse, noticeShort }
}
