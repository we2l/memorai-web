import { describe, expect, it } from 'vitest'
import { catalogPreview, hasPreview, previewIncludes, previewNotice } from '~/utils/preview'
import { checkoutAvailable } from '~/utils/checkout'
import { landingAiLine, landingFaqs, landingPlansLead, landingPodcastLine, landingTrialTerms } from '~/utils/landing'
import type { PlanCatalog } from '~/types'

const TEXT = 'Prévia grátis da IA, uma vez por conta: 1 PDF de até 50 páginas, 10 gerações de cards, 10 perguntas ao tira-dúvidas, 1 simulado de 10 questões, 1 melhoria de nota, 1 mapa mental e 1 podcast de 30 s.'
const catalog = (over: Partial<PlanCatalog> = {}): PlanCatalog => ({
  currency: 'BRL',
  period: 'calendar_month',
  period_timezone: 'America/Sao_Paulo',
  features: { podcast: { label: 'podcasts', unit: 'por mês', pro_benefit: '8 episódios por mês, de até 8 min' } },
  plans: [
    { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: {}, extras: {} as never },
    { key: 'pro', name: 'Intensivo', prices: { monthly: null, annual: null }, limits: {}, extras: {} as never },
  ],
  trial: null,
  preview: { lifetime: true, requires_verified_email: true, limits: { cards_ai: 10, agent_chat: 10, podcast: 1, pdf_to_note: 1, quiz_ai: 1, note_improve: 1, mindmap_ai: 1 }, pdf_pages: 50, quiz_max_questions: 10, quiz_short_answer: false, podcast_seconds: 30, text: TEXT },
  ...over,
})
const free = { id: 'u', plan: 'free', email_verified: true, trial: { status: 'used', started_at: null, ends_at: null } } as never

describe('prévia grátis (prd-uso-justo §9)', () => {
  it('vem do catálogo; o Grátis tem, o Intensivo não', () => {
    expect(catalogPreview(catalog())?.text).toBe(TEXT)
    expect(hasPreview(catalog(), free)).toBe(true)
    expect(hasPreview(catalog(), { ...(free as object), plan: 'pro' } as never)).toBe(false)
    expect(hasPreview(catalog({ preview: null }), free)).toBe(false)
    expect(previewIncludes(catalog(), 'mindmap_ai')).toBe(true)
    expect(previewIncludes(catalog(), 'study_structure')).toBe(false)
  })

  it('a linha: "Prévia grátis: 3 de 10 …" e, ao acabar, o convite ao Intensivo', () => {
    expect(previewNotice({ used: 3, limit: 10, remaining: 7 }, 'gerações de cards com IA', 'Intensivo'))
      .toEqual({ kind: 'preview', text: 'Prévia grátis: 3 de 10 gerações de cards com IA.' })
    expect(previewNotice({ used: 10, limit: 10, remaining: 0 }, 'gerações de cards com IA', 'Intensivo'))
      .toEqual({ kind: 'spent', text: 'Você usou a prévia grátis de gerações de cards com IA. No Intensivo, a IA tem cota todo mês.' })
    expect(previewNotice({ used: 0, limit: 0, remaining: 0 }, 'x', 'Intensivo')).toBeNull()
  })

  it('assinatura em breve (checkout.available false): o convite diz que abre em breve', () => {
    expect(checkoutAvailable(catalog())).toBe(true)
    expect(checkoutAvailable(catalog({ checkout: { available: false } }))).toBe(false)
    expect(previewNotice({ used: 1, limit: 1, remaining: 0 }, 'mapas mentais com IA', 'Intensivo', false)!.text).toContain('a assinatura abre em breve')
  })

  it('a landing lê a prévia do catálogo no lugar do teste', () => {
    const c = catalog()
    expect(landingTrialTerms(c)).toBe(`${TEXT} Pede o e-mail confirmado.`)
    expect(landingPlansLead(c)).toBe('A IA você experimenta na prévia grátis, uma vez por conta. No Intensivo, ela acompanha você até a prova.')
    expect(landingAiLine(c, { pdf: true })).toBe('Experimente na prévia grátis. A IA fica no Intensivo.')
    expect(landingPodcastLine(c)).toBe('No Intensivo: 8 episódios por mês, de até 8 min. No Grátis, uma prévia de 30 s.')
    expect(landingFaqs(c)[0]!.a).toContain(TEXT)
    expect(JSON.stringify([landingTrialTerms(c), landingPlansLead(c), landingFaqs(c)])).not.toMatch(/teste de \d+ dias|7 dias/)
  })
})
