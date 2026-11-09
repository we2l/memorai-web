import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import ReviewRatings from '~/components/review/ReviewRatings.vue'
import ReviewOrigin from '~/components/review/ReviewOrigin.vue'
import ReviewBatchEnd from '~/components/review/ReviewBatchEnd.vue'
import ReviewFeedback from '~/components/review/ReviewFeedback.vue'
import ReviewCard from '~/components/review/ReviewCard.vue'
import { createReviewShortcutHandler } from '~/composables/useReviewShortcuts'
import { feedbackText } from '~/utils/intervalLabel'
import type { BatchSummary } from '~/composables/useReviewBatches'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)
afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.body.innerHTML = ''
})

const summary = (extra: Partial<BatchSummary> = {}): BatchSummary => ({ size: 20, remembered: 17, percent: 85, minutes: 9, inDay: 12, far: 9, weak: null, errorIds: [], ...extra })

describe('botões (prd-4d-revisao-v3 RF-F4)', () => {
  it('De novo · Difícil · Bom · Fácil, com o intervalo, e só "Bom" é o primário', async () => {
    const w = await mountSuspended(ReviewRatings, { attachTo: document.body, props: { intervals: { again: '1min', hard: '2d', good: '6d', easy: '1.3m' } } })
    const buttons = w.findAll('button')
    expect(buttons.map(b => `${b.text().replace(b.get('span span').text(), '').trim()} | ${b.get('span span').text()}`)).toEqual(['De novo | em 1 min', 'Difícil | em 2 dias', 'Bom | em 6 dias', 'Fácil | em 40 dias'])
    // E2 (prd-visual-e2 RF-2.3): the 62 px rating button
    expect(buttons[0]!.classes()).toEqual(expect.arrayContaining(['min-h-15.5', 'rounded-rating']))
    expect(buttons[3]!.attributes('aria-label')).toBe('Fácil, volta em 40 dias (4)')
    expect(buttons.filter(b => b.attributes('data-variant') === 'primary').map(b => b.attributes('data-testid'))).toEqual(['rate-3'])
    await buttons[0]!.trigger('click')
    expect(w.emitted('rate')![0]).toEqual([1])
    expect(await axeViolations(document.body)).toEqual([])
  })
})

describe('dois botões (prd-revisao-v5-fase-a RF-F1)', () => {
  it('"Não lembrei" neutro e "Lembrei" primário, com o intervalo, mandando 1 e 3', async () => {
    const w = await mountSuspended(ReviewRatings, { attachTo: document.body, props: { mode: 'two', intervals: { again: '10min', hard: '1d', good: '2d', easy: '8d' } } })
    const buttons = w.findAll('button')
    expect(buttons.map(b => b.text().replace(/\s+/g, ' '))).toEqual(['Não lembrei em 10 min', 'Lembrei em 2 dias'])
    expect(buttons.map(b => b.attributes('data-variant'))).toEqual(['secondary', 'primary'])
    expect(buttons.map(b => b.attributes('data-testid'))).toEqual(['rate-1', 'rate-3'])
    await buttons[1]!.trigger('click')
    await buttons[0]!.trigger('click')
    expect(w.emitted('rate')).toEqual([[3], [1]])
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('o visitante vê "no fim do lote" sob o "Não lembrei"', async () => {
    const w = await mountSuspended(ReviewRatings, { props: { mode: 'two', againText: 'no fim do lote', intervals: { again: '1d', hard: '1d', good: '2d', easy: '8d' } } })
    expect(w.get('[data-testid=rate-1]').text()).toContain('no fim do lote')
  })
})

describe('faixa de resposta (prd-visual-e2 RF-2.4)', () => {
  const hit = { id: 1, kind: 'ok' as const, title: 'Na mosca!', when: 'Volta em 2 dias.', autoAdvance: true, canWhy: false }
  const miss = { id: 2, kind: 'again' as const, title: 'Tranquilo, faz parte.', when: 'Ele volta daqui a 10 minutos.', autoAdvance: false, canWhy: true }

  it('acerto: verde, golfinho comemorando, segue sozinho em 1,2 s; um toque para a contagem', async () => {
    vi.useFakeTimers()
    const w = await mountSuspended(ReviewFeedback, { attachTo: document.body, props: { feedback: hit } })
    const band = w.get('[data-testid=review-feedback]')
    expect(band.attributes('data-kind')).toBe('ok')
    expect(band.attributes('role')).toBe('status')
    expect(band.text()).toContain('Na mosca!')
    expect(band.find('img').attributes('src')).toContain('celebrating')
    expect(w.find('[data-testid=review-why]').exists()).toBe(false)
    vi.advanceTimersByTime(1199)
    expect(w.emitted('continue')).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(w.emitted('continue')).toHaveLength(1)
    const again = await mountSuspended(ReviewFeedback, { props: { feedback: { ...hit, id: 3 } } })
    await again.get('[data-testid=review-feedback]').trigger('pointerdown')
    vi.advanceTimersByTime(2000)
    expect(again.emitted('continue')).toBeUndefined()
    expect(again.emitted('cancel-auto')![0]).toEqual(['tap'])
    vi.useRealTimers()
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('erro: âmbar (nunca vermelho), golfinho pensando, espera o Continuar; "Por quê?" com P', async () => {
    vi.useFakeTimers()
    const w = await mountSuspended(ReviewFeedback, { attachTo: document.body, props: { feedback: miss } })
    const band = w.get('[data-testid=review-feedback]')
    expect(band.attributes('data-kind')).toBe('again')
    expect(band.find('img').attributes('src')).toContain('thinking')
    expect(band.html()).not.toMatch(/danger/)
    vi.advanceTimersByTime(5000)
    expect(w.emitted('continue')).toBeUndefined()
    expect(w.get('[data-testid=review-why]').attributes('aria-keyshortcuts')).toBe('P')
    await w.get('[data-testid=review-why]').trigger('click')
    await w.get('[data-testid=review-continue]').trigger('click')
    expect(w.emitted('why')).toHaveLength(1)
    expect(w.emitted('continue')).toHaveLength(1)
    vi.useRealTimers()
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('a frase do intervalo continua a do v5', () => {
    expect(feedbackText('Lembrei', '2d')).toBe('Lembrei · volta em 2 dias')
    expect(feedbackText('Não lembrei', '1d')).toBe('Não lembrei · volta amanhã')
    expect(feedbackText('Bom', '< 1d')).toBe('Bom · volta hoje')
  })
})

describe('virar o card (prd-revisao-v5-fase-a RF-F3)', () => {
  const card = { id: 'c', type: 'basic', front: 'Frente', back: 'Verso' } as never
  it('no celular (pointer: coarse) o toque não vira; com mouse, o clique vira', async () => {
    const original = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q === '(pointer: coarse)', media: q, addEventListener() {}, removeEventListener() {} })) as never
    const touch = await mountSuspended(ReviewCard, { props: { card, flipped: false } })
    await touch.get('[data-testid=review-card]').trigger('click', { detail: 1 })
    expect(touch.emitted('flip')).toBeUndefined()
    // A screen reader activation (detail 0) still turns it
    await touch.get('[data-testid=review-card]').trigger('click', { detail: 0 })
    expect(touch.emitted('flip')).toHaveLength(1)
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never
    const mouse = await mountSuspended(ReviewCard, { props: { card, flipped: false } })
    await mouse.get('[data-testid=review-card]').trigger('click', { detail: 1 })
    expect(mouse.emitted('flip')).toHaveLength(1)
    window.matchMedia = original
  })
})

describe('teclas do binário (prd-revisao-v5-fase-a D2)', () => {
  function press(mode: 'two' | 'four', key: string, flipped = true) {
    const rated: number[] = []
    let flips = 0
    const handler = createReviewShortcutHandler({ flip: () => flips++, rate: r => rated.push(r), undo() {}, toggleHelp() {}, escape() {}, isFlipped: () => flipped, mode: () => mode })
    handler(new KeyboardEvent('keydown', { key, cancelable: true }))
    return { rated, flips }
  }
  it('1 e ← = Não lembrei; 2, → e Espaço = Lembrei; 3 e 4 não fazem nada', () => {
    expect(press('two', '1').rated).toEqual([1])
    expect(press('two', 'ArrowLeft').rated).toEqual([1])
    expect(press('two', '2').rated).toEqual([3])
    expect(press('two', 'ArrowRight').rated).toEqual([3])
    expect(press('two', ' ').rated).toEqual([3])
    expect(press('two', '3').rated).toEqual([])
    expect(press('two', '4').rated).toEqual([])
  })
  it('só avalia com o verso na tela; com 4 botões nada muda', () => {
    expect(press('two', '2', false).rated).toEqual([])
    expect(press('two', ' ', false).flips).toBe(1)
    expect(press('four', '2').rated).toEqual([2])
    expect(press('four', 'ArrowRight').rated).toEqual([])
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

describe('questão colada (prd-questao-errada RF-F5)', () => {
  it('"questão colada · fonte" e "Ver a questão" abre o diálogo, não sai da sessão', async () => {
    const w = await mountSuspended(ReviewOrigin, { props: { origin: { kind: 'question', question_id: 'pq1', title: 'Sobre o controle', source: 'FGV · 2023' }, backTo: '/revisar' } })
    expect(w.text()).toContain('Origem: questão colada · FGV · 2023')
    const link = w.get('[data-testid=review-origin-link]')
    expect(link.element.tagName).toBe('BUTTON')
    expect(link.attributes('aria-keyshortcuts')).toBe('O')
    await link.trigger('click')
    expect(w.emitted('view-question')![0]).toEqual(['pq1'])
    expect(w.emitted('open')![0]).toEqual(['question'])
    const plain = await mountSuspended(ReviewOrigin, { props: { origin: { kind: 'question', question_id: 'pq2', title: 'T', source: null }, backTo: '/revisar' } })
    expect(plain.text()).toContain('Origem: questão colada')
  })
})

describe('fim do lote (RF-F5)', () => {
  const base = { index: 1, goal: { batch_size: 20, target_batches: 3, done_batches: 1, met: false }, streak: { current: 7, record: true, extendedNow: true }, nextCount: 20, backTo: '/cadernos/t', backLabel: 'Voltar a TRF' }

  it('E2: golfinho, "Bom trabalho, Ana!", chip da sequência, arco "17 de 20", duas métricas e um primário (RF-2.7)', async () => {
    const w = await mountSuspended(ReviewBatchEnd, { attachTo: document.body, props: { ...base, name: 'Ana', summary: summary(), goalMet: false } })
    expect(w.attributes('data-kind')).toBe('batch')
    expect(w.find('h1').text()).toBe('Bom trabalho, Ana!')
    expect(w.text()).toContain('Lote 1 concluído')
    expect(w.get('[data-testid=batch-streak-chip]').text()).toBe('Sua sequência subiu para 7 dias')
    expect(w.get('[data-testid=ui-arc]').attributes('data-got')).toBe('17')
    expect(w.get('[data-testid=batch-remembered]').text()).toBe('Você lembrou 17 de 20')
    // Memory, not points (prd-revisao-v5-fase-a RF-F5)
    expect(w.get('[data-testid=batch-lead]').text()).toBe('9 cards só voltam daqui a uma semana ou mais.')
    expect(w.get('[data-testid=batch-goal]').text()).toContain('Lotes da meta de hoje')
    expect(w.find('[data-testid=batch-goal] [aria-label="1 de 3"]').exists()).toBe(true)
    expect(w.get('[data-testid=batch-streak]').text()).toContain('Sequência, seu recorde')
    expect(w.text()).not.toContain('%')
    expect(w.get('[data-testid=batch-next]').text()).toBe('Próximo lote · 20 cards')
    expect(w.findAll('.bg-action')).toHaveLength(1)
    expect(w.find('[data-testid=batch-errors]').exists()).toBe(false)
    expect(w.find('[data-testid=batch-weak]').exists()).toBe(false)
    expect(document.activeElement?.tagName).toBe('H1')
    expect(await axeViolations(document.body)).toEqual([])
  })

  it('meta cumprida: chip "Meta de hoje feita"; "Reforçar os N que errei"; ponto fraco só com ≥ 3 erros e fora de idiomas', async () => {
    const weak = summary({ weak: { id: 't2', name: 'Difuso', errors: 3 }, errorIds: ['a', 'b', 'c'] })
    const w = await mountSuspended(ReviewBatchEnd, { props: { ...base, summary: weak, goalMet: true } })
    expect(w.attributes('data-kind')).toBe('goal')
    expect(w.find('h1').text()).toBe('Meta de hoje feita!')
    expect(w.get('[data-testid=batch-goal-chip]').text()).toBe('Meta de hoje feita')
    expect(w.get('[data-testid=batch-errors]').attributes('href')).toBe('/revisar?scope=cards&card_ids=a,b,c')
    expect(w.get('[data-testid=batch-errors]').text()).toBe('Reforçar os 3 que errei')
    expect(w.find('[data-testid=batch-weak] a').attributes('href')).toBe('/simulados?topic_id=t2&count=10')
    const lang = await mountSuspended(ReviewBatchEnd, { props: { ...base, summary: weak, goalMet: false, language: true } })
    expect(lang.find('[data-testid=batch-weak]').exists()).toBe(false)
  })
})
