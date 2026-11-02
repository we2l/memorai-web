import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import ConfigSheet from '~/components/quiz/ConfigSheet.vue'

const { apiMock, toastShow } = vi.hoisted(() => ({ apiMock: vi.fn(), toastShow: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))
mockNuxtImport('usePlans', () => () => ({ fetchPlans: vi.fn(), limitOf: () => ({ extras: { quiz_max_questions: 20, quiz_short_answer: true } }) }))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const tree = [
  { id: 'en', name: 'Inglês', parent_id: null, children: [{ id: 'voc', name: 'Vocabulary', parent_id: 'en', children: [] }] },
  { id: 'pt', name: 'Português', parent_id: null, children: [] },
]
const needsMaterial = { ok: false, code: 'needs_material', requirement: { required: 100, current: 60 } }

function api(details: Record<string, unknown>, create?: () => Promise<unknown>) {
  apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url.startsWith('/topics/') && url.endsWith('/details')) return Promise.resolve({ data: { id: url.split('/')[2], ...details } })
    if (url === '/quizzes' && opts?.method === 'POST') return create ? create() : Promise.resolve({ data: { id: 'q1' } })
    return Promise.resolve({ data: [] })
  })
}

async function mountSheet(topicId: string | null) {
  useTopicStore().tree = tree as any
  const wrapper = await mountSuspended(ConfigSheet, { props: { modelValue: true, topicId }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const select = () => document.querySelector('select') as HTMLSelectElement
const submit = () => [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Gerar simulado')) as HTMLButtonElement
const notice = () => document.querySelector('[role="dialog"] p[role="status"]')?.textContent?.trim()

describe('QuizConfigSheet', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastShow.mockReset()
  })

  it('abre com o caderno de onde a pessoa veio (/simulados?topic_id=, RF-F1)', async () => {
    api({ can_quiz: { ok: true } })
    await mountSheet('voc')
    expect(select().value).toBe('voc')
    expect(apiMock).toHaveBeenCalledWith('/topics/voc/details')
    expect(submit().disabled).toBe(false)
  })

  it('mostra o requisito antes e não deixa gerar (RF-F5)', async () => {
    api({ can_quiz: needsMaterial })
    await mountSheet('pt')
    expect(notice()).toBe('Escreva 100 palavras em notas para liberar · faltam 40')
    expect(submit().disabled).toBe(true)
  })

  it('422 com code vira a mesma mensagem, nunca um erro cru', async () => {
    const err = Object.assign(new Error('422'), { status: 422, data: { message: 'x', code: 'needs_material', requirement: { required: 100, current: 10 } } })
    api({ can_quiz: { ok: true } }, () => Promise.reject(err))
    const wrapper = await mountSheet('pt')
    submit().click()
    await flushPromises()
    expect(notice()).toBe('Escreva 100 palavras em notas para liberar · faltam 90')
    expect(toastShow).not.toHaveBeenCalled()
    expect(wrapper.emitted('created')).toBeUndefined()
  })

  it('cria o simulado no escopo escolhido', async () => {
    api({ can_quiz: { ok: true } })
    const wrapper = await mountSheet('en')
    submit().click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/quizzes', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ topic_id: 'en', quantity: 10 }) }))
    expect(wrapper.emitted('created')?.[0]).toEqual([{ id: 'q1' }])
  })
})
