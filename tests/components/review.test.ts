import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import ReviewRatings from '~/components/review/ReviewRatings.vue'
import ReviewOrigin from '~/components/review/ReviewOrigin.vue'
import ReviewBatchEnd from '~/components/review/ReviewBatchEnd.vue'
import type { BatchSummary } from '~/composables/useReviewBatches'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const summary = (extra: Partial<BatchSummary> = {}): BatchSummary => ({ size: 20, remembered: 17, percent: 85, minutes: 9, inDay: 12, weak: null, errorIds: [], ...extra })

describe('botões (prd-4d-revisao-v3 RF-F4)', () => {
  it('De novo · Difícil · Bom · Fácil, com o intervalo, e só "Bom" é o primário', async () => {
    const w = await mountSuspended(ReviewRatings, { attachTo: document.body, props: { intervals: { again: '< 1 min', hard: '2 d', good: '6 d', easy: '14 d' } } })
    const buttons = w.findAll('button')
    expect(buttons.map((b) => { const [label, interval] = b.findAll('span').map(s => s.text()); return `${label!.replace(/^\d\s*/, '')} | ${interval}` })).toEqual(['De novo | < 1 min', 'Difícil | 2 d', 'Bom | 6 d', 'Fácil | 14 d'])
    expect(buttons.filter(b => b.attributes('data-variant') === 'primary').map(b => b.attributes('data-testid'))).toEqual(['rate-3'])
    await buttons[0]!.trigger('click')
    expect(w.emitted('rate')![0]).toEqual([1])
    expect(await axeViolations(document.body)).toEqual([])
  })
})

describe('origem do card (RF-F3)', () => {
  const back = '/revisar?scope=topic:t'
  it('apostila com parte, "Abrir o trecho" para o material com a volta, e "errou N vezes"', async () => {
    const w = await mountSuspended(ReviewOrigin, {
      props: { origin: { kind: 'document', note_id: 'n1', title: 'Controle', document_id: 'd', document_name: 'Apostila de Direito.pdf', part: { index: 4, total: 6 }, page: null }, lapses: 2, topicId: 't9', backTo: back },
    })
    expect(w.text()).toContain('Origem: Apostila de Direito · parte 4 de 6')
    expect(w.text()).toContain('Você errou este card 2 vezes')
    expect(w.find('[data-testid=review-origin-link]').attributes('href')).toBe(`/cadernos/t9/material/n1?from=review&back=${encodeURIComponent(back)}`)
  })

  it('questão do simulado e nota manual; sem origem nada aparece', async () => {
    const quiz = await mountSuspended(ReviewOrigin, { props: { origin: { kind: 'quiz', quiz_id: 'q1', title: 'Simulado', question_number: 7 }, backTo: back } })
    expect(quiz.text()).toContain('questão 7 do Simulado')
    expect(quiz.find('a').attributes('href')).toBe('/simulados/q1/resultado#q7')
    const note = await mountSuspended(ReviewOrigin, { props: { origin: { kind: 'note', note_id: 'n2', title: 'Resumo', topic_id: 't3' }, backTo: back } })
    expect(note.find('a').text()).toContain('Abrir a nota')
    const none = await mountSuspended(ReviewOrigin, { props: { origin: null, lapses: 1, backTo: back } })
    expect(none.find('[data-testid=review-origin]').exists()).toBe(false)
  })
})

describe('fim do lote (RF-F5)', () => {
  const base = { index: 1, goal: { batch_size: 20, target_batches: 3, done_batches: 1, met: false }, streak: { current: 7, record: true, extendedNow: true }, nextCount: 20, backTo: '/cadernos/t', backLabel: 'Voltar a TRF' }

  it('"Lote concluído!", lembrou X de Y, meta em lotes com texto, sequência com recorde e um primário', async () => {
    const w = await mountSuspended(ReviewBatchEnd, { attachTo: document.body, props: { ...base, summary: summary(), goalMet: false } })
    expect(w.attributes('data-kind')).toBe('batch')
    expect(w.find('h1').text()).toBe('Lote concluído!')
    expect(w.text()).toContain('Você lembrou 17 de 20')
    expect(w.find('[data-testid=batch-goal]').text()).toContain('1 de 3 lotes')
    expect(w.find('[data-testid=batch-streak]').text()).toContain('7 dias seguidos · recorde pessoal')
    expect(w.find('[data-testid=batch-next]').text()).toBe('Próximo lote (20)')
    expect(w.find('[data-testid=batch-weak]').exists()).toBe(false)
    expect(document.activeElement?.tagName).toBe('H1')
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('meta cumprida vira "Meta de hoje cumprida!"; ponto fraco só com ≥ 3 erros (questões; idiomas reforça os erros)', async () => {
    const weak = summary({ weak: { id: 't2', name: 'Difuso', errors: 3 }, errorIds: ['a', 'b', 'c'] })
    const w = await mountSuspended(ReviewBatchEnd, { props: { ...base, summary: weak, goalMet: true } })
    expect(w.attributes('data-kind')).toBe('goal')
    expect(w.find('h1').text()).toBe('Meta de hoje cumprida!')
    expect(w.find('[data-testid=batch-weak] a').attributes('href')).toBe('/simulados?topic_id=t2&count=10')
    const lang = await mountSuspended(ReviewBatchEnd, { props: { ...base, summary: weak, goalMet: false, language: true } })
    expect(lang.find('[data-testid=batch-weak] a').attributes('href')).toBe('/revisar?scope=cards&card_ids=a,b,c')
  })
})
