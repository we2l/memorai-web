import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { axeViolations } from './ui/axe'
import StudyHeatmap from '~/components/progress/StudyHeatmap.vue'
import ExamReadiness from '~/components/progress/ExamReadiness.vue'
import PerformanceTable from '~/components/progress/PerformanceTable.vue'
import ProgressExamCard from '~/components/progress/ExamCard.vue'
import ProgressSummary from '~/components/progress/ProgressSummary.vue'
import ExamDialog from '~/components/exam/ExamDialog.vue'
import ExamRow from '~/components/progress/ExamRow.vue'
import ExamList from '~/components/progress/ExamList.vue'

const { apiMock, toastShow } = vi.hoisted(() => ({ apiMock: vi.fn(), toastShow: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })
beforeEach(() => { apiMock.mockReset(); toastShow.mockReset() })

describe('StudyHeatmap (prd-4f-progresso-v3 RF-F6)', () => {
  const history = { from: '2026-05-05', to: '2026-11-02', days: [{ date: '2026-11-02', reviews: 45 }, { date: '2026-11-01', reviews: 10 }], max: 45 }

  it('182 dias, cada um um botão com nome; hoje marcado; os vazios preenchidos', async () => {
    const w = await mountSuspended(StudyHeatmap, { props: { history } })
    const buttons = w.findAll('[role="grid"] button')
    expect(buttons).toHaveLength(182)
    const today = w.get('button[aria-current="date"]')
    expect(today.attributes('aria-label')).toBe('2 de novembro: 45 revisões')
    expect(today.classes()).toContain('bg-action')
    expect(w.find('button[aria-label="1 de novembro: 10 revisões"]').classes()).toContain('bg-action-subtle')
    expect(w.find('button[aria-label="31 de outubro: sem estudo"]').classes()).toContain('bg-progress-track')
    expect(today.attributes('tabindex')).toBe('0')
  })

  it('setas andam pelos dias (cima = dia anterior) e o clique abre o dia', async () => {
    const w = await mountSuspended(StudyHeatmap, { props: { history }, attachTo: document.body })
    const today = w.get('button[aria-current="date"]')
    await today.trigger('focus')
    await w.get('[role="grid"]').trigger('keydown', { key: 'ArrowUp' })
    await flushPromises()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('1 de novembro: 10 revisões')
    await w.get('[role="grid"]').trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('25 de outubro: sem estudo')
    await today.trigger('click')
    expect(w.emitted('open')?.[0]).toEqual(['2026-11-02'])
  })
})

const READINESS = { version: 1, score: 72, band: { key: 'well_prepared', label: 'Bem preparado' }, capped: false, parts: [
      { key: 'memory', label: 'Memória no dia da prova', value: 88, weight: 0.5, enabled: true, keep_pace: 88, stop_today: 61 },
      { key: 'on_track', label: 'Revisões em dia', value: 95, weight: 0.15, enabled: true, late: 12, in_review: 240 },
      { key: 'questions', label: 'Acerto em questões', value: 64, weight: 0.2, enabled: true, answered: 30, min_answered: 10 },
      { key: 'coverage', label: 'Assuntos da prova com cards', value: null, weight: 0.15, enabled: false },
    ], actions: [
      { kind: 'review_late', count: 12, topic_id: 'root' },
      { kind: 'practice_weak', topic_id: 'adm', topic_name: 'Direito Administrativo', accuracy: 45 },
    ], missing: null }

describe('ExamReadiness (prd-prontidao-prova RF-F4)', () => {
  it('número, faixa, partes, "Como calculamos" e até 3 ações', async () => {
    const w = await mountSuspended(ExamReadiness, { props: { readiness: { ...READINESS, capped: true } as never }, attachTo: document.body })
    expect(w.text()).toContain('Prontidão: 72 de 100 · Bem preparado')
    expect(w.get('[data-testid="exam-readiness-parts"]').text()).toBe('Memória 88 · Em dia 95 · Questões 64')
    const explain = w.get('button')
    expect(explain.attributes('aria-expanded')).toBe('false')
    await explain.trigger('click')
    const text = w.get('[data-testid="exam-readiness-explain"]').text()
    expect(text).toContain('Memória no dia da prova (peso 50%): 88 (lembrando 88% mantendo o ritmo, 61% se parar hoje).')
    expect(text).toContain('no máximo até 84')
    expect(text).toContain('não da aprovação')
    expect(text).not.toContain('Assuntos da prova com cards')
    const links = w.findAll('a')
    expect(links.map(l => l.text())).toEqual(['Revise os 12 cards atrasados da prova', 'Faça 10 questões de Direito Administrativo: acerto 45%'])
    expect(links[1]!.attributes('href')).toBe('/simulados?topic_id=adm&count=10')
    expect(await axeViolations(w.element)).toEqual([])
  })

  it('sem número: o que falta, sem botão', async () => {
    const w = await mountSuspended(ExamReadiness, { props: { readiness: { ...READINESS, score: null, band: null, parts: [], actions: [], missing: { cards: 25, cards_needed: 20, graduated: 4, graduated_needed: 10 } } as never } })
    expect(w.text()).toBe('Revise mais 6 cards da prova para ver sua prontidão.')
    expect(w.find('button').exists()).toBe(false)
  })
})

describe('ExamRow: passada pelo is_past da API (api #133)', () => {
  const exam = (over: object) => ({ id: 'e', title: 'TRF', exam_date: '2026-11-04', days_remaining: 0, is_past: false, days_since: null, urgency_color: 'green', reta_final_enabled: false, reta_final_active: false, google_calendar_event_id: null, topics: [{ id: 't', name: 'TRF' }], created_at: '', ...over })

  it('o dia da prova não é passado, mesmo com days_remaining 0', async () => {
    const w = await mountSuspended(ExamRow, { props: { exam: exam({}) as never } })
    expect(w.text()).toContain('é hoje')
    expect(w.text()).not.toContain('Como foi?')
  })

  it('passada: quantos dias faz e "Como foi?"', async () => {
    const w = await mountSuspended(ExamRow, { props: { exam: exam({ is_past: true, days_since: 20 }) as never } })
    expect(w.text()).toContain('há 20 dias')
    expect(w.text()).toContain('Como foi?')
    const yesterday = await mountSuspended(ExamRow, { props: { exam: exam({ is_past: true, days_since: 1 }) as never } })
    expect(yesterday.text()).toContain('foi ontem')
  })

  it('a lista separa por is_past, não pela data do navegador', async () => {
    const w = await mountSuspended(ExamList, { props: { exams: [exam({ id: 'a', title: 'Futura', exam_date: '2000-01-01' }), exam({ id: 'b', title: 'Passada', exam_date: '2999-01-01', is_past: true, days_since: 3 })] as never, state: 'ok' } as never })
    const future = w.findAll('[data-testid^="exam-"]').map(r => r.attributes('data-testid'))
    expect(future).toContain('exam-a')
    expect(future).toContain('exam-b')
    expect(w.text().indexOf('Futura')).toBeLessThan(w.text().indexOf('Passada'))
  })
})

describe('PerformanceTable (RF-F5)', () => {
  const row = (topic_id: string, parent_id: string | null, depth: number, name: string, mastery: number | null, answered: number, accuracy: number | null, session_count: number) =>
    ({ topic_id, parent_id, depth, name, cards: 30, mastery, questions: { answered, correct: 0, accuracy }, session_count })
  const rows = [
    row('root', null, 0, 'TRF', 41, 30, 55, 12),
    row('pt', 'root', 1, 'Português', 62, 12, 74, 5),
    row('const', 'root', 1, 'Constitucional', 48, 15, 40, 3),
    row('ctrl', 'const', 2, 'Controle', 31, 4, null, 0),
  ]

  it('a ação da linha: Treinar (< 60% com ≥ 10), Revisar N ou Abrir; "—" sem 10 questões', async () => {
    const w = await mountSuspended(PerformanceTable, { props: { rows, rootId: 'root' } })
    const line = (id: string) => w.get(`[data-testid="performance-${id}"]`)
    expect(line('pt').get('a').text()).toBe('Revisar 5')
    expect(line('pt').get('a').attributes('href')).toBe('/revisar?topic_id=pt')
    expect(line('const').text()).toContain('Treinar')
    expect(line('ctrl').get('a').text()).toBe('Abrir')
    expect(line('ctrl').text()).toContain('faça 10 questões')
    await line('const').get('button').trigger('click')
    expect(w.emitted('train')?.[0]).toEqual(['const'])
  })

  it('"Mais fracos primeiro" ordena pelo menor entre acerto e domínio', async () => {
    const w = await mountSuspended(PerformanceTable, { props: { rows, rootId: 'root' } })
    await w.get('select').setValue('weak')
    const order = w.findAll('[role="rowheader"]').map(r => r.text())
    expect(order[0]).toBe('Constitucional')
  })

  it('todos os cadernos: uma linha por caderno, que abre as matérias', async () => {
    const w = await mountSuspended(PerformanceTable, { props: { rows, rootId: null } })
    expect(w.findAll('[role="rowheader"]').map(r => r.text())).toEqual(['TRF'])
    await w.get('[role="rowheader"] button').trigger('click')
    expect(w.findAll('[role="rowheader"]').map(r => r.text())).toEqual(['TRF', 'Português', 'Constitucional'])
  })
})

describe('ProgressSummary (RF-F2)', () => {
  it('domínio com a tendência em texto e sinal, acerto só com 10, recorde', async () => {
    const w = await mountSuspended(ProgressSummary, { props: { scopeName: 'TRF', data: { mastery: { percent: 41, in_day: 902, cards: 2200, delta_30d: 6 }, questions: { answered: 4, accuracy: null }, retention_30d: 88, streak: 6, streak_longest: 11 } } })
    expect(w.get('[data-testid="progress-metric-mastery"]').text()).toBe('41%de domínio em TRF · ▲ +6 pontos em 30 dias')
    expect(w.text()).toContain('Faça 10 questões para ver o acerto')
    expect(w.get('[data-testid="progress-metric-streak"]').text()).toBe('6diasde sequência · recorde 11')
  })
})

describe('ExamDialog (RF-F9)', () => {
  const tree = [{ id: 'root', name: 'TRF', parent_id: null, children: [{ id: 'const', name: 'Constitucional', parent_id: 'root', children: [] }, { id: 'pt', name: 'Português', parent_id: 'root', children: [] }] }]

  async function mountDialog(props: Record<string, unknown>) {
    useTopicStore().tree = tree as any
    await mountSuspended(ExamDialog, { props: { modelValue: true, origin: 'progress', ...props }, attachTo: document.body })
    await flushPromises()
  }
  const input = (testid: string) => document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement
  const set = (el: HTMLInputElement, v: string) => { el.value = v; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')) }

  it('aberto de uma matéria: o caderno dela e "Algumas matérias" com ela marcada; o POST leva a cobertura', async () => {
    apiMock.mockResolvedValue({ data: { id: 'e1', reta_final_enabled: true } })
    await mountDialog({ topicIds: ['const'] })
    expect(input('exam-root').value).toBe('root')
    expect((document.querySelector('input[type="radio"][value="some"]') as HTMLInputElement).checked).toBe(true)
    set(input('exam-date'), '2099-01-10')
    ;(document.querySelector('[data-testid="exam-save"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/exams', { method: 'POST', body: { title: 'Constitucional', exam_date: '2099-01-10', topic_ids: ['const'] } })
  })

  it('422 coverage_mixed_roots e o limite do Free viram texto no diálogo', async () => {
    await mountDialog({ topicIds: ['root'] })
    set(input('exam-date'), '2099-01-10')
    apiMock.mockRejectedValueOnce(Object.assign(new Error('422'), { status: 422, data: { code: 'coverage_mixed_roots', errors: { topic_ids: ['x'] } } }))
    ;(document.querySelector('[data-testid="exam-save"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(document.body.textContent).toContain('A prova cobre um caderno só')
    apiMock.mockRejectedValueOnce(Object.assign(new Error('422'), { status: 422, data: { errors: { limit: ['Limite'] } } }))
    ;(document.querySelector('[data-testid="exam-save"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(document.querySelector('[data-testid="exam-limit-error"]')?.textContent).toContain('até 2 provas futuras')
    // exam_limit_reached (API #131): the number comes from the requirement
    apiMock.mockRejectedValueOnce(Object.assign(new Error('422'), { status: 422, data: { code: 'exam_limit_reached', requirement: { limit: 3, current: 3, plan: 'free', plan_required: 'pro' } } }))
    ;(document.querySelector('[data-testid="exam-save"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(document.querySelector('[data-testid="exam-limit-error"]')?.textContent).toContain('até 3 provas futuras')
    expect(document.querySelector('[data-testid="exam-limit-error"] a')?.getAttribute('href')).toBe('/planos')
    expect(toastShow).not.toHaveBeenCalled()
  })
})

describe('ProgressExamCard (prd-prontidao-prova RF-F3)', () => {
  const exam = (over: Record<string, unknown>) => ({ id: 'e', title: 'Técnico do INSS', exam_date: '2026-12-22', days_remaining: 44, is_past: false, days_since: null, topics: [], readiness: READINESS, ...over })

  it('a prova mais próxima com número é o bloco lilás, com faixa e partes; sem número, nada', async () => {
    const w = await mountSuspended(ProgressExamCard, { props: { exams: [exam({ id: 'b', days_remaining: 90 }), exam({})] as never }, attachTo: document.body })
    expect(w.get('section').classes()).toContain('bg-tinted')
    expect(w.text()).toContain('Técnico do INSS · em 44 dias')
    expect(w.text()).toContain('Prontidão para a prova')
    expect(w.get('[data-testid="readiness-parts"]').text()).toBe('Memória 88 · Em dia 95 · Questões 64')
    expect(w.text()).not.toMatch(/chance|aprova/i)
    expect(await axeViolations(w.element)).toEqual([])
    const none = await mountSuspended(ProgressExamCard, { props: { exams: [exam({ readiness: { ...READINESS, score: null } })] as never } })
    expect(none.find('section').exists()).toBe(false)
  })
})
