import type { FeatureUsageData } from '~/types'

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
    const f = usage.value.features[feature]
    if (!f || f.limit === null) return true
    return f.remaining !== null && f.remaining > 0
  }

  function remaining(feature: string): number | null {
    if (!usage.value) return null
    return usage.value.features[feature]?.remaining ?? null
  }

  function isLimited(feature: string): boolean {
    if (!usage.value) return false
    const f = usage.value.features[feature]
    return f?.limit !== null && f?.limit !== undefined
  }

  /** The period of the counts: the trial's 7 days or the calendar month. */
  const periodLabel = computed(() => (usage.value?.tier === 'trial' ? 'no teste' : 'este mês'))

  // The trial opened (or ended) under this screen: the quotas change with it
  watch(() => auth.user?.trial?.status, (now, before) => {
    if (before && now !== before && usage.value) void fetchUsage()
  })

  return { usage, loading, fetchUsage, canUse, remaining, isLimited, opensTrial, periodLabel }
}
