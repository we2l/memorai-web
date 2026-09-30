import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTopicCards } from '~/composables/useTopicCards'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const cards = Array.from({ length: 200 }, (_, i) => ({ id: `c${i}`, front: `f${i}`, back: '', state: 'new', due: null }))
const details = { id: 'x', flashcards_truncated: true, flashcards_count: 450, due_count: 12, new_count: 300 }

describe('useTopicCards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
    apiMock.mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } })
  })
  afterEach(() => vi.useRealTimers())

  it('truncated=true: busca chama /topics/x/flashcards uma vez após 300 ms de digitação', async () => {
    const tc = useTopicCards()
    tc.setCards(cards, details)
    expect(tc.listMode.value).toBe('server')

    tc.searchCards('a')
    await vi.advanceTimersByTimeAsync(100)
    tc.searchCards('ab')
    await vi.advanceTimersByTimeAsync(100)
    tc.searchCards('abc')
    await vi.advanceTimersByTimeAsync(299)
    expect(apiMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock).toHaveBeenCalledWith('/topics/x/flashcards', {
      query: expect.objectContaining({ q: 'abc', page: 1 }),
    })
  })

  it('truncated=true: usa os totais do servidor e pagina a partir do que /details trouxe', async () => {
    const tc = useTopicCards()
    tc.setCards(cards, details)
    expect(tc.totalCards.value).toBe(450)
    expect(tc.dueCardsCount.value).toBe(12)
    expect(tc.hasMorePages.value).toBe(true)

    apiMock.mockResolvedValue({ data: [{ id: 'c200' }], meta: { current_page: 5, last_page: 9, per_page: 50, total: 450 } })
    tc.loadNextPage()
    await vi.advanceTimersByTimeAsync(0)
    expect(apiMock).toHaveBeenCalledWith('/topics/x/flashcards', { query: expect.objectContaining({ page: 5 }) })
    expect(tc.listCards.value).toHaveLength(201)
  })

  it('abaixo do limite: modo client, sem request', async () => {
    const tc = useTopicCards()
    tc.setCards(cards.slice(0, 20), { ...details, flashcards_truncated: false, flashcards_count: 20 })
    tc.searchCards('abc')
    await vi.advanceTimersByTimeAsync(1000)
    expect(tc.listMode.value).toBe('client')
    expect(apiMock).not.toHaveBeenCalled()
    expect(tc.totalCards.value).toBe(20)
  })
})
