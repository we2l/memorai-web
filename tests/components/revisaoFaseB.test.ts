import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import ReviewCheck from '~/components/review/ReviewCheck.vue'
import ReviewLeech from '~/components/review/ReviewLeech.vue'
import BacklogLine from '~/components/backlog/Line.vue'
import { createReviewShortcutHandler } from '~/composables/useReviewShortcuts'
import { swipeRating } from '~/composables/useSwipeRate'
import { backlogPerDay } from '~/composables/useBacklogPlan'
import { buildDayPlan } from '~/composables/useDayPlan'
import type { BacklogState, Stats } from '~/types'
import { axeViolations } from './ui/axe'

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const backlog = (extra: Partial<BacklogState> = {}): BacklogState => ({
  overdue: 340, pending: 340, threshold: 40, active: true, new_paused: true, pause_new: true, plan: null, ...extra,
})

describe('Certo / Errado / Em branco (prd-revisao-v5-fase-b RF-F5)', () => {
  it('a escolha vira o card; Continuar envia acerto = 3, erro e branco = 1', async () => {
    const w = await mountSuspended(ReviewCheck, { attachTo: document.body, props: { check: { mode: 'true_false', answer: 'errado' }, flipped: false } })
    expect(await axeViolations(w.element)).toEqual([])
    await w.get('[data-testid=check-certo]').trigger('click')
    expect(w.emitted('flip')).toHaveLength(1)
    await w.setProps({ flipped: true })
    expect(w.get('[data-testid=check-result]').text()).toBe('Você marcou Certo · Gabarito: Errado')
    await w.get('[data-testid=check-continue]').trigger('click')
    expect(w.emitted('rate')![0]).toEqual([1, { answer_mode: 'true_false', answer_outcome: 'wrong' }])
  })

  it('em branco é Again, gravado como blank (B-D6)', async () => {
    const w = await mountSuspended(ReviewCheck, { props: { check: { mode: 'true_false', answer: 'certo' }, flipped: false } })
    await w.get('[data-testid=check-blank]').trigger('click')
    await w.setProps({ flipped: true })
    await w.get('[data-testid=check-continue]').trigger('click')
    expect(w.emitted('rate')![0]).toEqual([1, { answer_mode: 'true_false', answer_outcome: 'blank' }])
  })

  it('C, E e B respondem antes de virar; Espaço e os números não fazem nada', () => {
    const chosen: string[] = []
    let flips = 0
    const rated: number[] = []
    const handler = createReviewShortcutHandler({
      flip: () => flips++, rate: r => rated.push(r), undo() {}, toggleHelp() {}, escape() {}, isFlipped: () => false,
      mode: () => 'two', checkMode: () => 'true_false', answerTrueFalse: c => chosen.push(c),
    })
    for (const key of ['c', 'E', 'b', ' ', '1', '2']) handler(new KeyboardEvent('keydown', { key, cancelable: true }))
    expect(chosen).toEqual(['certo', 'errado', 'blank'])
    expect([flips, rated.length]).toEqual([0, 0])
  })
})

describe('digitar a resposta (RF-F6, B-D7)', () => {
  it('igual sem acento e caixa: Acertei é o primário', async () => {
    const w = await mountSuspended(ReviewCheck, { props: { check: { mode: 'typed', answer: 'Ação Civil Pública' }, flipped: false } })
    await w.get('input').setValue('acao civil publica')
    await w.get('form').trigger('submit')
    expect(w.emitted('flip')).toHaveLength(1)
    await w.setProps({ flipped: true })
    expect(w.get('[data-testid=check-diff]').text()).toContain('Igual à resposta')
    await w.get('[data-testid=check-right]').trigger('click')
    expect(w.emitted('rate')![0]).toEqual([3, { answer_mode: 'typed', answer_outcome: 'correct', typed_match: true }])
  })

  it('diferente: mostra o que faltou e deixa contar como certo (falsa negativa)', async () => {
    const w = await mountSuspended(ReviewCheck, { props: { check: { mode: 'typed', answer: 'to borrow' }, flipped: false } })
    await w.get('input').setValue('borrow')
    await w.get('form').trigger('submit')
    await w.setProps({ flipped: true })
    expect(w.get('[data-testid=check-diff]').text()).toContain('faltou: to')
    await w.get('[data-testid=check-count-right]').trigger('click')
    expect(w.emitted('rate')![0]).toEqual([3, { answer_mode: 'typed', answer_outcome: 'correct', typed_match: false }])
  })

  it('"Lembrar sem digitar" volta à autoavaliação', async () => {
    const w = await mountSuspended(ReviewCheck, { props: { check: { mode: 'typed', answer: 'x' }, flipped: false } })
    await w.get('[data-testid=check-skip]').trigger('click')
    expect(w.emitted('skip')).toHaveLength(1)
  })
})

describe('leech (RF-F7)', () => {
  it('diz quantos erros e oferece origem, reescrever, explicar e pausar', async () => {
    const w = await mountSuspended(ReviewLeech, { attachTo: document.body, props: { lapses: 5, hasOrigin: true, canExplain: true } })
    expect(w.text()).toContain('Esse card não está colando (5 erros)')
    for (const a of ['origin', 'rewrite', 'explain', 'pause']) await w.get(`[data-testid=leech-${a}]`).trigger('click')
    expect(Object.keys(w.emitted())).toEqual(expect.arrayContaining(['origin', 'rewrite', 'explain', 'pause']))
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('deslizar (RF-F10, B-D10)', () => {
  it('só horizontal e acima do limiar (30% da largura, mínimo 96 px)', () => {
    expect(swipeRating(120, 10, 300)).toBe(3)
    expect(swipeRating(-120, 10, 300)).toBe(1)
    expect(swipeRating(90, 0, 300)).toBeNull()
    expect(swipeRating(150, 0, 600)).toBeNull()
    expect(swipeRating(200, 180, 300)).toBeNull()
  })
})

describe('atraso como plano (RF-F1, RF-F2)', () => {
  it('a linha do atraso nunca é o número do dia', async () => {
    const w = await mountSuspended(BacklogLine, { props: { backlog: backlog(), origin: 'home' } })
    expect(w.get('[data-testid=backlog-line-overdue]').text()).toContain('Atraso: 340 cards · Recuperar em dias')
    expect(w.find('[data-testid=backlog-line-paused]').exists()).toBe(true)
  })

  it('com plano: o dia e o que falta', async () => {
    const w = await mountSuspended(BacklogLine, { props: { backlog: backlog({ overdue: 0, active: false, plan: { days: 7, started_on: '2026-11-08', day: 2, total: 340, remaining: 291, today: 49 } }), origin: 'caderno', scope: 'caderno', count: 0 } })
    expect(w.get('[data-testid=backlog-line-plan]').text()).toContain('Recuperando o atraso de todos os cadernos · dia 2 de 7 · faltam 291')
  })

  it('divide por dia como a API (ceil)', () => {
    expect([backlogPerDay(340, 3), backlogPerDay(340, 7), backlogPerDay(340, 14)]).toEqual([114, 49, 25])
  })

  it('o Hoje mostra só o dia; sem nada para hoje, o passo vira "Recuperar o atraso"', () => {
    const stats = { due_today: 30, goal: { batch_size: 20, minutes_left: 8 }, backlog: backlog() } as unknown as Stats
    const [step] = buildDayPlan({ stats, backlog: null, progress: [], pendingActions: [], podcasts: [], recentNote: null })
    expect(step!.title).toBe('Revisar 30 cards')
    expect(step!.backlog?.overdue).toBe(340)
    const empty = buildDayPlan({ stats: { ...stats, due_today: 0 } as Stats, backlog: null, progress: [], pendingActions: [], podcasts: [], recentNote: null })
    expect(empty[0]!.title).toBe('Recuperar o atraso')
    expect(empty[0]!.action.to).toBe('/revisar?backlog=1')
  })
})
