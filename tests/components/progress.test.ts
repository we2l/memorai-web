import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import StudyHeatmap from '~/components/progress/StudyHeatmap.vue'
import ExamProjection from '~/components/progress/ExamProjection.vue'
import PerformanceTable from '~/components/progress/PerformanceTable.vue'
import ProgressSummary from '~/components/progress/ProgressSummary.vue'
import ExamDialog from '~/components/exam/ExamDialog.vue'

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

describe('ExamProjection (RF-F4)', () => {
  it('dois números, o nome completo para o leitor de tela e "Como calculamos"', async () => {
    const w = await mountSuspended(ExamProjection, { props: { examTitle: 'TRF', projection: { keep_pace: 78, stop_today: 52, cards: 2200, reviewed_cards: 1505, new_cards: 695, desired_retention: 0.9, new_per_day: 20, computed_for: '2026-12-14' } } })
    expect(w.text()).toContain('78% se mantiver o ritmo · 52% se parar hoje')
    expect(w.get('.sr-only').text()).toBe('Projeção na prova TRF: 78% mantendo o ritmo, 52% se parar hoje')
    await w.get('button').trigger('click')
    expect(w.text()).toContain('20 cards novos por dia')
  })

  it('sem dado suficiente (null): o que fazer, sem número', async () => {
    const w = await mountSuspended(ExamProjection, { props: { examTitle: 'TRF', projection: null } })
    expect(w.text()).toBe('Revise alguns cards dos assuntos da prova para ver a projeção.')
    expect(w.find('button').exists()).toBe(false)
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
    expect(w.text()).toContain('41%de domínio em TRF▲ +6 pontos em 30 dias')
    expect(w.text()).toContain('Faça 10 questões para ver o acerto')
    expect(w.text()).toContain('6 diasde sequência · recorde 11')
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
    expect(toastShow).not.toHaveBeenCalled()
  })
})
