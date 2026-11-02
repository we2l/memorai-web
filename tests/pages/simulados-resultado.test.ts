import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Page from '~/pages/simulados/[id]/resultado.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
// Auth pages redirect a test mount to /entrar: the page only reads the id
mockNuxtImport('useRoute', () => () => ({ params: { id: 'q1' }, query: {}, path: '/simulados/q1/resultado' }))

const question = (id: string, isCorrect: boolean) => ({
  id, position: Number(id.slice(1)), type: 'true_false', stem: `Afirmação ${id}`, options: null, topic_tag: null,
  user_answer: 'true', correct_answer: isCorrect ? 'true' : 'false', is_correct: isCorrect, explanation: null, ai_feedback: null, ai_score: null,
})
const quiz = (extra: Record<string, unknown> = {}) => ({
  id: 'q1', title: 'Simulado de Inglês', status: 'completed', mode: 'learning', total_questions: 2, correct_count: 1, score_percent: 50,
  time_spent_seconds: 90, topic: { id: 't1', name: 'Inglês' }, cards_created_at: null, questions: [question('q1', true), question('q2', false)], ...extra,
})

function api(q = quiz()) {
  apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/quizzes/q1/create-cards' && opts?.method === 'POST') return Promise.resolve({ data: { cards_created: 1 } })
    if (url === '/quizzes/q1') return Promise.resolve({ data: q })
    return Promise.resolve({ data: [] })
  })
}

async function mountPage() {
  const wrapper = await mountSuspended(Page)
  await flushPromises()
  return wrapper
}

const link = (wrapper: Awaited<ReturnType<typeof mountPage>>, text: string) => wrapper.findAll('a').find(a => a.text() === text)

describe('/simulados/[id]/resultado (prd-caderno-f1-pontes RF-F2)', () => {
  beforeEach(() => apiMock.mockReset())

  it('"Voltar ao caderno" leva ao caderno do simulado, e o novo simulado mantém o escopo', async () => {
    api()
    const wrapper = await mountPage()
    expect(link(wrapper, 'Voltar ao caderno')?.attributes('href')).toBe('/cadernos?topic=t1')
    expect(link(wrapper, 'Novo simulado')?.attributes('href')).toBe('/simulados?topic_id=t1')
  })

  it('depois de "Criar cards dos erros": o próximo passo no mesmo escopo, não só um toast', async () => {
    api()
    const wrapper = await mountPage()
    const create = wrapper.findAll('button').find(b => b.text() === 'Criar cards dos erros (1)')!
    await create.trigger('click')
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes/q1/create-cards', { method: 'POST' })
    expect(wrapper.get('[role="status"]').text()).toContain('1 card dos erros criado em Inglês.')
    expect(link(wrapper, 'Revisar agora')?.attributes('href')).toBe('/revisar?topic_id=t1')
    expect(link(wrapper, 'Voltar ao caderno')?.attributes('href')).toBe('/cadernos?topic=t1&tab=cards')
  })

  it('cards já criados em outra visita: o mesmo retorno, sem número inventado', async () => {
    api(quiz({ cards_created_at: '2026-11-01T10:00:00Z' }))
    const wrapper = await mountPage()
    expect(wrapper.get('[role="status"]').text()).toContain('Os cards dos erros já foram criados em Inglês.')
    expect(link(wrapper, 'Revisar agora')).toBeDefined()
  })
})
