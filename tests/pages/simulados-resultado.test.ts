import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Page from '~/pages/simulados/[id]/resultado.vue'

const { apiMock, navigate } = vi.hoisted(() => ({ apiMock: vi.fn(), navigate: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
// Auth pages redirect a test mount to /entrar: the page only reads the id
mockNuxtImport('useRoute', () => () => ({ params: { id: 'q1' }, query: {}, hash: '', path: '/simulados/q1/resultado' }))
mockNuxtImport('navigateTo', () => navigate)

const question = (id: string, isCorrect: boolean, flashcard: string | null = null) => ({
  id, position: Number(id.slice(2)), type: 'true_false', stem: `Afirmação ${id}`, options: null, topic_tag: null, flashcard_id: flashcard,
  user_answer: 'true', correct_answer: isCorrect ? 'true' : 'false', is_correct: isCorrect, explanation: null, ai_feedback: null, ai_score: null,
})
const preview = (n: number, card: string | null = null) => ({ question_id: `qq${n}`, number: n, topic_id: 'ctrl', topic_name: 'Controle', front: `Frente ${n}`, back: `Verso ${n}`, card_id: card })
const quiz = (extra: Record<string, unknown> = {}) => ({
  id: 'q1', title: 'Questões', status: 'completed', mode: 'learning', kind: 'battery', total_questions: 3, correct_count: 1, score_percent: 33,
  time_spent_seconds: 300, topic: { id: 't1', name: 'Constitucional' }, cards_created_at: null,
  questions: [question('qq1', true), question('qq2', false), question('qq3', false)],
  previous: { quiz_id: 'q0', score_percent: 26, delta: 7 },
  by_topic: [{ topic_id: 'ctrl', name: 'Controle', answered: 3, correct: 1, accuracy: 33, history_accuracy: 42 }],
  error_cards_preview: [preview(2), preview(3)],
  cards_from_errors: { count: 0, session_count: 0 },
  ...extra,
})

function api(first = quiz(), after = first, created: Record<string, unknown> = { cards_created: 1, card_ids: ['c2'], session_count: 1 }) {
  let calls = 0
  apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/quizzes/q1/create-cards' && opts?.method === 'POST') return Promise.resolve({ data: created })
    if (url === '/quizzes/q1/retry-errors' && opts?.method === 'POST') return Promise.resolve({ data: { id: 'q2', status: 'in_progress' } })
    if (url === '/quizzes/q1') return Promise.resolve({ data: calls++ === 0 ? first : after })
    return Promise.resolve({ data: [] })
  })
}

async function mountPage() {
  const wrapper = await mountSuspended(Page)
  await flushPromises()
  return wrapper
}

const button = (w: Awaited<ReturnType<typeof mountPage>>, text: string) => w.findAll('button').find(b => b.text().includes(text))
const link = (w: Awaited<ReturnType<typeof mountPage>>, text: string) => w.findAll('a').find(a => a.text().includes(text))

describe('/simulados/[id]/resultado (prd-4e-praticar-v3 RF-F4)', () => {
  beforeEach(() => { apiMock.mockReset(); navigate.mockReset() })

  it('placar, comparação com a última vez e desempenho por assunto com link', async () => {
    api()
    const w = await mountPage()
    expect(w.get('h1').text()).toBe('Você acertou 1 de 3')
    expect(w.get('[data-testid="quiz-delta"]').text()).toContain('+7 pontos em relação à última vez')
    const byTopic = w.get('[data-testid="quiz-by-topic"]')
    expect(byTopic.text()).toContain('1 de 3')
    expect(byTopic.text()).toContain('nesta bateria abaixo do histórico')
    expect(byTopic.find('a').attributes('href')).toBe('/cadernos/ctrl')
  })

  it('um bloco tingido só, e o primário cria só os erros marcados', async () => {
    api(quiz(), quiz({ error_cards_preview: [preview(2, 'c2'), preview(3)], cards_from_errors: { count: 1, session_count: 1 } }))
    const w = await mountPage()
    expect(w.findAll('.bg-tinted')).toHaveLength(1)
    const boxes = w.findAll('[data-testid="quiz-error-cards"] input[type="checkbox"]')
    expect(boxes).toHaveLength(2)
    await boxes[1]!.setValue(false)
    await button(w, 'Criar 1 card')!.trigger('click')
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes/q1/create-cards', { method: 'POST', body: { question_ids: ['qq2'] } })
    // The unchecked error can still become a card later
    expect(w.get('[data-testid="error-card-3"] input').attributes('disabled')).toBeUndefined()
  })

  it('depois de criar: "Revisar os N agora" com scope=quiz: e "Voltar a" o escopo', async () => {
    api(quiz({ error_cards_preview: [preview(2, 'c2'), preview(3, 'c3')], cards_from_errors: { count: 2, session_count: 2 }, cards_created_at: '2026-11-02' }))
    const w = await mountPage()
    expect(link(w, 'Revisar os 2 agora')?.attributes('href')).toBe('/revisar?scope=quiz:q1')
    expect(link(w, 'Voltar a Constitucional')?.attributes('href')).toBe('/cadernos/t1')
    expect(w.findAll('[data-testid="error-card-done"]')).toHaveLength(2)
  })

  it('sem erros: "Novas questões" no mesmo escopo', async () => {
    api(quiz({ correct_count: 3, score_percent: 100, questions: [question('qq1', true)], error_cards_preview: [] }))
    const w = await mountPage()
    expect(link(w, 'Novas questões')?.attributes('href')).toBe('/simulados?topic_id=t1')
    expect(button(w, 'Refazer as que errei')).toBeUndefined()
  })

  it('"Refazer as que errei" cria a cópia e abre a nova bateria', async () => {
    api()
    const w = await mountPage()
    await button(w, 'Refazer as que errei (2)')!.trigger('click')
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes/q1/retry-errors', { method: 'POST' })
    expect(navigate).toHaveBeenCalledWith('/simulados/q2')
  })

  it('erro de rede: "Tentar de novo", nunca spinner infinito', async () => {
    apiMock.mockRejectedValue(Object.assign(new Error('rede'), { status: undefined }))
    const w = await mountPage()
    expect(w.text()).toContain('Não foi possível carregar o resultado')
    expect(button(w, 'Tentar de novo')).toBeTruthy()
  })

  it('simulado não terminado abre a tela de responder', async () => {
    api(quiz({ status: 'in_progress' }))
    await mountPage()
    expect(navigate).toHaveBeenCalledWith('/simulados/q1', { replace: true })
  })
})
