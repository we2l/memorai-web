interface FeatureData {
  used: number
  limit: number | null
  remaining: number | null
}

interface UsageData {
  plan: string
  period_start: string
  period_end: string
  features: Record<string, FeatureData>
}

export function useFeatureUsage() {
  const { $api } = useNuxtApp()
  const usage = ref<UsageData | null>(null)
  const loading = ref(false)

  async function fetchUsage() {
    loading.value = true
    try {
      const res = await $api<any>('/usage')
      usage.value = res.data
    } catch {
      // Silently fail — usage is non-critical
    } finally {
      loading.value = false
    }
  }

  function canUse(feature: string): boolean {
    if (!usage.value) return true
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

  return { usage, loading, fetchUsage, canUse, remaining, isLimited }
}
