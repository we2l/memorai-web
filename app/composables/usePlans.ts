import type { CatalogFeature, CatalogPlan, PlanCatalog, PlanKey } from '~/types'

const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Offer catalog from GET /api/plans — the only source of limits and prices in the UI (RN-01).
 * Fetched once per session and shared through useState.
 */
export function usePlans() {
  const plans = useState<PlanCatalog | null>('plans', () => null)
  const failed = useState<boolean>('plans-failed', () => false)
  const pending = useState<Promise<PlanCatalog | null> | null>('plans-pending', () => null)

  async function fetchPlans(): Promise<PlanCatalog | null> {
    if (plans.value) return plans.value
    if (pending.value) return pending.value

    const { $api } = useNuxtApp()
    pending.value = $api<{ data: PlanCatalog }>('/plans')
      .then((res) => {
        plans.value = res.data
        failed.value = false
        return res.data
      })
      .catch(() => {
        failed.value = true
        return null
      })
      .finally(() => {
        pending.value = null
      })

    return pending.value
  }

  function feature(key: string): CatalogFeature | null {
    return plans.value?.features?.[key] ?? null
  }

  function limitOf(planKey: PlanKey): CatalogPlan | null {
    return plans.value?.plans?.find(p => p.key === planKey) ?? null
  }

  function formatPrice(cents: number): string {
    return priceFormatter.format(cents / 100)
  }

  return { plans, failed, fetchPlans, feature, limitOf, formatPrice }
}
