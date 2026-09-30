import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePodcastStore } from '~/stores/podcast'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const page = (status: string) => ({ data: [{ id: 'p1', status }], meta: { last_page: 1 } })

describe('usePodcastStore polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    apiMock.mockReset()
    apiMock.mockResolvedValue(page('generating_audio'))
  })

  afterEach(() => {
    usePodcastStore().stopPolling()
    vi.useRealTimers()
  })

  it('startPolling() 2x mantém um único timer', async () => {
    const store = usePodcastStore()
    await store.fetchPodcasts()
    store.startPolling()
    store.startPolling()
    expect(vi.getTimerCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(apiMock).toHaveBeenCalledTimes(2)
  })

  it('stopPolling() não deixa timer', async () => {
    const store = usePodcastStore()
    await store.fetchPodcasts()
    store.startPolling()
    store.stopPolling()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('para sozinho quando não há mais pendentes', async () => {
    const store = usePodcastStore()
    await store.fetchPodcasts()
    store.startPolling()
    apiMock.mockResolvedValue(page('completed'))
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(apiMock).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
