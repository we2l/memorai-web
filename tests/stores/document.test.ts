import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDocumentStore } from '~/stores/document'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

let visibility: DocumentVisibilityState = 'visible'
const doc = (status: string) => ({ data: [{ id: 'd1', status, note_generation_status: null }] })

describe('useDocumentStore polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    visibility = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  afterEach(() => {
    useDocumentStore().reset()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('consulta a cada 4 s enquanto processing e para em completed', async () => {
    apiMock.mockResolvedValue(doc('processing'))
    const store = useDocumentStore()
    await store.fetchForTopic('t1')
    expect(apiMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(4000)
    expect(apiMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(4000)
    expect(apiMock).toHaveBeenCalledTimes(3)
    expect(apiMock.mock.calls[2]![1]).toMatchObject({ params: { topic_id: 't1' } })
    expect(apiMock.mock.calls[2]![1].signal).toBeInstanceOf(AbortSignal)

    apiMock.mockResolvedValue(doc('completed'))
    await vi.advanceTimersByTimeAsync(4000)
    expect(apiMock).toHaveBeenCalledTimes(4)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(apiMock).toHaveBeenCalledTimes(4)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('aba oculta pausa o polling', async () => {
    apiMock.mockResolvedValue(doc('processing'))
    const store = useDocumentStore()
    await store.fetchForTopic('t1')

    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(apiMock).toHaveBeenCalledTimes(1)

    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    expect(apiMock).toHaveBeenCalledTimes(2)
  })
})
