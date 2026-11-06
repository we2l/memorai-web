import { describe, expect, it } from 'vitest'
import { planBenefitLines, planComparison } from '~/utils/planOffer'
import type { PlanCatalog } from '~/types'

const extras = { pdf_pages_per_note: 100, rag_max_pages: 300, upload_max_mb: 50, pdf_pages_monthly_cap: 4000, quiz_max_questions: 10, quiz_short_answer: false, podcast_format: 'teaser' as const, podcast_max_minutes: 0.5 }

const catalog: PlanCatalog = {
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  plans: [
    { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: { cards_ai: 10, pdf_to_note: 1, podcast: 1, mindmap_ai: 0 }, extras },
    { key: 'pro', name: 'Pro', prices: { monthly: null, annual: null }, limits: { cards_ai: null, pdf_to_note: 20, podcast: 5, mindmap_ai: null }, extras: { ...extras, pdf_pages_per_note: 500, podcast_format: 'full', podcast_max_minutes: 15 } },
  ],
  features: {
    cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: 'Gerações ilimitadas' },
    pdf_to_note: { label: 'PDFs transformados em nota', unit: 'por mês', pro_benefit: '20 PDFs' },
    podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '5 episódios' },
    mindmap_ai: { label: 'mapas mentais com IA', unit: 'por mês', pro_benefit: 'Mapas ilimitados' },
  },
}

describe('planBenefitLines', () => {
  it('monta cada linha só do catálogo: limite, unidade e detalhe', () => {
    expect(planBenefitLines(catalog, 'free')).toEqual([
      'Gerações de cards com IA: 10 por mês',
      'PDFs transformados em nota: 1 por mês (até 100 páginas cada)',
      'Podcasts: 1 por mês (prévia de ~30s)',
    ])
    expect(planBenefitLines(catalog, 'pro')).toEqual([
      'Gerações ilimitadas',
      'PDFs transformados em nota: 20 por mês (até 500 páginas cada)',
      'Podcasts: 5 por mês (até 15 min)',
      'Mapas ilimitados',
    ])
  })

  it('podcast_format none (o Grátis sem podcast): sem "prévia" nem detalhe', () => {
    const none = { ...catalog, plans: [{ ...catalog.plans[0]!, limits: { podcast: 0 }, extras: { ...extras, podcast_format: 'none' as const, podcast_max_minutes: 0 } }, catalog.plans[1]!] }
    expect(planBenefitLines(none, 'free')).toEqual([])
    const row = planComparison(none).find(r => r.key === 'podcast')!
    expect(row.cells[0]).toEqual({ plan: 'free', text: 'Não incluído', detail: null, included: false })
  })

  it('sem catálogo não inventa linha', () => {
    expect(planBenefitLines(null, 'free')).toEqual([])
  })
})

describe('planComparison', () => {
  it('uma linha por recurso, uma célula por plano, com "Ilimitado" e "Não incluído"', () => {
    const rows = planComparison(catalog)
    expect(rows.map(r => r.key)).toEqual(['cards_ai', 'pdf_to_note', 'podcast', 'mindmap_ai'])
    expect(rows[0]).toEqual({
      key: 'cards_ai',
      label: 'Gerações de cards com IA',
      cells: [
        { plan: 'free', text: '10 por mês', detail: null, included: true },
        { plan: 'pro', text: 'Ilimitado', detail: null, included: true },
      ],
    })
    expect(rows[1]!.cells[1]!.detail).toBe('até 500 páginas cada')
    expect(rows[3]!.cells[0]).toEqual({ plan: 'free', text: 'Não incluído', detail: null, included: false })
  })

  it('muda quando o catálogo muda', () => {
    const changed = structuredClone(catalog)
    changed.plans[1]!.limits.podcast = 7
    expect(planComparison(changed)[2]!.cells[1]!.text).toBe('7 por mês')
  })

  it('sem catálogo, sem tabela', () => {
    expect(planComparison(null)).toEqual([])
  })
})
