import type { CatalogFeature, CatalogPlan, PlanCatalog, PlanKey } from '~/types'

const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

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
    return plans.value?.features[key] ?? null
  }

  function limitOf(planKey: PlanKey): CatalogPlan | null {
    return plans.value?.plans.find(p => p.key === planKey) ?? null
  }

  function formatPrice(cents: number): string {
    return priceFormatter.format(cents / 100)
  }

  /** One benefit line per public feature, built only from the catalog. */
  function benefitLines(planKey: PlanKey): string[] {
    const plan = limitOf(planKey)
    if (!plan || !plans.value) return []

    return Object.entries(plans.value.features).flatMap(([key, f]) => {
      const limit = plan.limits[key]
      if (limit === 0 || limit === undefined) return []
      if (limit === null) return [planKey === 'free' ? `${capitalize(f.label)}: ilimitado` : f.pro_benefit]

      let line = `${capitalize(f.label)}: ${limit} por mês`
      if (key === 'pdf_to_note') line += ` (até ${plan.extras.pdf_pages_per_note} páginas cada)`
      if (key === 'quiz_ai') line += ` (até ${plan.extras.quiz_max_questions} questões)`
      if (key === 'podcast') {
        line += plan.extras.podcast_format === 'teaser'
          ? ` (prévia de ~${Math.round(plan.extras.podcast_max_minutes * 60)}s)`
          : ` (até ${plan.extras.podcast_max_minutes} min)`
      }
      return [line]
    })
  }

  return { plans, failed, fetchPlans, feature, limitOf, formatPrice, benefitLines }
}
