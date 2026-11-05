import type { CatalogPlan, PlanCatalog, PlanKey } from '~/types'

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export interface PlanComparisonRow {
  key: string
  label: string
  cells: { plan: PlanKey; text: string; detail: string | null; included: boolean }[]
}

/** The catalog's limit that goes with a feature ("até 100 páginas cada"), when it has one. */
function limitDetail(plan: CatalogPlan, key: string): string | null {
  if (key === 'pdf_to_note') return `até ${plan.extras.pdf_pages_per_note} páginas cada`
  if (key === 'quiz_ai') return `até ${plan.extras.quiz_max_questions} questões`
  if (key === 'podcast') {
    return plan.extras.podcast_format === 'teaser'
      ? `prévia de ~${Math.round(plan.extras.podcast_max_minutes * 60)}s`
      : `até ${plan.extras.podcast_max_minutes} min`
  }
  return null
}

/** One benefit line per public feature, built only from the catalog (RN-01). */
export function planBenefitLines(catalog: PlanCatalog | null, planKey: PlanKey): string[] {
  const plan = catalog?.plans?.find(p => p.key === planKey)
  if (!plan || !catalog) return []

  return Object.entries(catalog.features).flatMap(([key, f]) => {
    const limit = plan.limits[key]
    if (limit === 0 || limit === undefined) return []
    if (limit === null) return [planKey === 'free' ? `${capitalize(f.label)}: ilimitado` : f.pro_benefit]

    const detail = limitDetail(plan, key)
    return [`${capitalize(f.label)}: ${limit} ${f.unit}${detail ? ` (${detail})` : ''}`]
  })
}

/** Comparison table of /planos: features x plans of the catalog, with "Ilimitado" and the unit ("por mês"). */
export function planComparison(catalog: PlanCatalog | null): PlanComparisonRow[] {
  if (!catalog) return []
  return Object.entries(catalog.features).map(([key, f]) => ({
    key,
    label: capitalize(f.label),
    cells: catalog.plans.map((plan) => {
      const limit = plan.limits[key]
      if (limit === 0 || limit === undefined) return { plan: plan.key, text: 'Não incluído', detail: null, included: false }
      return { plan: plan.key, text: limit === null ? 'Ilimitado' : `${limit} ${f.unit}`, detail: limitDetail(plan, key), included: true }
    }),
  }))
}
