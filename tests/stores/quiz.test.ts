import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useQuizStore } from '~/stores/quiz'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const page = (ids: string[], lastPage: number) => ({ data: ids.map(id => ({ id })), meta: { last_page: lastPage } })

describe('useQuizStore.fetchQuizzes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('lê todas as páginas do histórico, não só a primeira', async () => {
    apiMock.mockImplementation((_url: string, opts: { params: { page: number } }) =>
      Promise.resolve(page(opts.params.page === 1 ? ['a', 'b'] : opts.params.page === 2 ? ['c', 'b'] : ['d'], 3)))
    const store = useQuizStore()

    await store.fetchQuizzes()

    expect(apiMock).toHaveBeenCalledTimes(3)
    expect(store.quizzes.map(q => q.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('com uma página só faz uma chamada e passa o topic_id', async () => {
    apiMock.mockResolvedValueOnce(page(['a'], 1))
    const store = useQuizStore()

    await store.fetchQuizzes('t1')

    expect(apiMock).toHaveBeenCalledWith('/quizzes', { params: { topic_id: 't1', page: 1 } })
    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(store.quizzes.map(q => q.id)).toEqual(['a'])
  })

  it('para no teto de páginas', async () => {
    apiMock.mockImplementation((_url: string, opts: { params: { page: number } }) => Promise.resolve(page([`q${opts.params.page}`], 99)))
    const store = useQuizStore()

    await store.fetchQuizzes()

    expect(apiMock).toHaveBeenCalledTimes(20)
  })
})
