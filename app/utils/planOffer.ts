import type { CatalogPlan, PlanCatalog, PlanKey } from '~/types'

const countFormatter = new Intl.NumberFormat('pt-BR')

/** "1.500": the catalog's numbers with the thousands separator. */
function formatCount(n: number): string {
  return countFormatter.format(n)
}

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
    // none: the plan has no podcast (the Free since the planos de lançamento), so no detail to give
    if (plan.extras.podcast_format === 'none' || !plan.extras.podcast_max_minutes) return null
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
    // null is only for what costs no AI (RN-1, prd-uso-justo): never "ilimitado" for the AI of the paid plan
    if (limit === null) return [`${capitalize(f.label)}: sem limite`]

    const detail = limitDetail(plan, key)
    return [`${capitalize(f.label)}: ${formatCount(limit)} ${f.unit}${detail ? ` (${detail})` : ''}`]
  })
}

/** Comparison table of /planos: features x plans of the catalog, with the number and the unit ("400 por mês"). */
export function planComparison(catalog: PlanCatalog | null): PlanComparisonRow[] {
  if (!catalog) return []
  return Object.entries(catalog.features).map(([key, f]) => ({
    key,
    label: capitalize(f.label),
    cells: catalog.plans.map((plan) => {
      const limit = plan.limits[key]
      if (limit === 0 || limit === undefined) return { plan: plan.key, text: 'Não incluído', detail: null, included: false }
      return { plan: plan.key, text: limit === null ? 'Sem limite' : `${formatCount(limit)} ${f.unit}`, detail: limitDetail(plan, key), included: true }
    }),
  }))
}
