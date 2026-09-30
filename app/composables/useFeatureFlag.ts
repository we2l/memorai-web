/**
 * Client feature flag (prd-analytics-posthog RF-F09). Falls back without PostHog or consent.
 * Flags that gate money/limits (reverse trial, Fase 2) must be evaluated on the backend instead.
 */
import type { FeatureFlagKey } from '~/types/analytics'

export function useFeatureFlag(key: FeatureFlagKey, fallback = false): Ref<boolean> {
  const value = ref(fallback)

  useNuxtApp().$posthog?.run((ph) => {
    ph.onFeatureFlags(() => {
      const enabled = ph.isFeatureEnabled(key)
      value.value = enabled === undefined ? fallback : enabled
    })
  })

  return value
}
