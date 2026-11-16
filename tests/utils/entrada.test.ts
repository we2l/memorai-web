import { describe, expect, it } from 'vitest'
import type { PlanCatalog } from '~/types'
import {
  ENTRY_CARD_INTERVALS, ENTRY_FEATURES, ENTRY_STEPS, brl, cardFeedback, entryStepOf, finalLine, freeAiLine, paidName,
  paidPrices, planLines, podcastMinutes, podcastPlanLine, returnIn, sampleLineAt,
} from '~/utils/entrada'

// The catalog of GET /api/plans as the API answered on 16/11 (the parts the entry reads)
const PREVIEW_TEXT = 'Prévia grátis da IA, uma vez por conta: 1 PDF de até 50 páginas, 10 gerações de cards, 10 perguntas ao tira-dúvidas, 1 simulado de 10 questões, 1 melhoria de nota, 1 mapa mental, 1 leitura de edital e 1 podcast de 30 s.'
function catalog(over: Partial<PlanCatalog> = {}, paid = 'Intensivo'): PlanCatalog {
  return {
    currency: 'BRL', period: 'calendar_month', period_timezone: 'America/Sao_Paulo', trial: null,
    preview: { lifetime: true, requires_verified_email: true, limits: { podcast: 1, pdf_to_note: 1 }, pdf_pages: 50, quiz_max_questions: 10, quiz_short_answer: false, podcast_seconds: 30, text: PREVIEW_TEXT },
    plans: [
      { key: 'free', name: 'Grátis', prices: { monthly: null, annual: null }, limits: { podcast: 1 }, extras: { podcast_max_minutes: 0.5 } as never },
      { key: 'pro', name: paid, prices: { monthly: { amount_cents: 3490, label: 'R$ 34,90/mês' }, annual: { amount_cents: 23990, label: 'R$ 239,90/ano' } }, limits: { pdf_to_note: 20, quiz_ai: 40, podcast: 8 }, extras: { podcast_max_minutes: 8 } as never },
    ],
    features: {
      pdf_to_note: { label: '', unit: 'por mês', pro_benefit: '20 PDFs por mês, até 500 páginas cada' },
      quiz_ai: { label: '', unit: 'por mês', pro_benefit: '40 simulados por mês, com dissertativas' },
      podcast: { label: '', unit: 'por mês', pro_benefit: '8 episódios por mês, de até 8 min' },
    },
    ...over,
  }
}

describe('entrada do /comecar: passos', () => {
  it('?passo=1..7 vira o índice; qualquer outra coisa é a entrada', () => {
    expect(entryStepOf('1')).toBe(0)
    expect(entryStepOf('7')).toBe(6)
    expect(entryStepOf(['3'])).toBe(2)
    for (const raw of [undefined, null, '', '0', '8', '1.5', 'abc', '01']) expect(entryStepOf(raw)).toBeNull()
  })

  it('cada recurso da faixa abre um passo do tour, sem repetir', () => {
    const steps = ENTRY_FEATURES.map(f => f.step)
    expect(new Set(steps).size).toBe(6)
    for (const s of steps) expect(s).toBeLessThan(ENTRY_STEPS.length - 1)
    expect(ENTRY_STEPS).toHaveLength(7)
  })
})

describe('o card do passo 1 (RN-2)', () => {
  it('volta em 2 dias com Lembrei e amanhã com Não lembrei, os intervalos do baralho de exemplo da API', () => {
    // GET /onboarding/areas/{area} on 16/11: intervals.good = 2d, intervals.again = 1d (GuestDeckService)
    expect(ENTRY_CARD_INTERVALS).toEqual({ remembered: 2, forgot: 1 })
    expect(cardFeedback('remembered').text).toBe('Então este card só volta daqui a 2 dias.')
    expect(cardFeedback('forgot').text).toBe('Este card volta amanhã, antes de sumir da memória.')
    expect(returnIn(1)).toBe('amanhã')
    expect(returnIn(8)).toBe('daqui a 8 dias')
  })
})

describe('planos só do catálogo (RN-4)', () => {
  it('sem catálogo, nenhum número', () => {
    expect(planLines(null, 'free')).toEqual([])
    expect(planLines(null, 'pro')).toEqual([])
    expect(paidPrices(null)).toBeNull()
    expect(finalLine(null)).toBe('Revisar não custa nada.')
    expect(podcastMinutes(null)).toBeNull()
    expect(podcastPlanLine(null)).toBeNull()
  })

  it('o Grátis leva a frase da prévia inteira, como a API escreve', () => {
    expect(planLines(catalog(), 'free')).toEqual(['Revisar todos os seus cards, para sempre', PREVIEW_TEXT])
    expect(freeAiLine(catalog())).toBe(PREVIEW_TEXT)
    expect(finalLine(catalog())).toBe('Revisar não custa nada. A IA tem uma prévia para você testar com o seu material.')
  })

  it('com o teste no catálogo, a frase do teste', () => {
    const c = catalog({ preview: null, trial: { days: 7, card_required: false } })
    expect(freeAiLine(c)).toBe('Teste de 7 dias da IA no primeiro material, sem cartão')
    expect(finalLine(c)).toBe('Revisar não custa nada. A IA você testa por 7 dias, sem cartão, com o seu material.')
  })

  it('o pago: nome, preços e benefícios do catálogo', () => {
    const c = catalog({}, 'Pro')
    expect(paidName(c)).toBe('Pro')
    expect(paidName(null)).toBe('Intensivo')
    expect(paidPrices(c)).toEqual({ monthly: 'R$ 34,90', annual: 'R$ 239,90' })
    expect(planLines(c, 'pro')).toEqual([
      '20 PDFs por mês, até 500 páginas cada',
      '40 simulados por mês, com dissertativas',
      '8 episódios por mês, de até 8 min',
      'Sem fidelidade: o mensal cancela quando quiser',
    ])
    expect(brl(129900)).toBe('R$ 1.299,00')
  })

  it('o podcast: teto de minutos e a prévia do Grátis', () => {
    expect(podcastMinutes(catalog())).toBe(8)
    expect(podcastPlanLine(catalog())).toBe('No Intensivo: 8 episódios por mês, de até 8 min. No Grátis, uma prévia de 30 s.')
    const noPreview = catalog({ preview: null })
    expect(podcastPlanLine(noPreview)).toBe('No Intensivo: 8 episódios por mês, de até 8 min.')
  })

  it('nada de "ilimitado" nem "app" nos textos fixos', () => {
    const texts = [...ENTRY_FEATURES.flatMap(f => [f.title, f.text]), finalLine(catalog()), ...planLines(catalog(), 'pro')]
    for (const t of texts) expect(t).not.toMatch(/ilimitad|\bapp\b|aplicativo|aprova/i)
  })
})

describe('amostra do podcast', () => {
  it('a fala atual segue o tempo', () => {
    expect(sampleLineAt(0)).toBe(0)
    expect(sampleLineAt(11)).toBe(3)
  })
})
