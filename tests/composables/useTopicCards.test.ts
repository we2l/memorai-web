import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTopicCards } from '~/composables/useTopicCards'
import type { TopicDetails } from '~/types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

// /details only with aggregates (prd-performance-caderno RF-B4): no `flashcards`
const details: TopicDetails = {
  id: 'x', name: 'Direito', progress: 0.57, flashcards_count: 2200, notes_count: 137, review_count: 1260,
  weak_count: 843, due_count: 277, new_count: 663, learning_count: 103, session_count: 317, streak: 31,
  evolution: { mastered: 1434, recovered: 773, total: 2200 }, goal: null,
}
const page = (n: number, ids: string[], last = 44) => ({ data: ids.map(id => ({ id, front: id, back: '', state: 'new', due: null })), meta: { current_page: n, last_page: last, per_page: 50, total: 2200 } })

describe('useTopicCards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
    apiMock.mockResolvedValue(page(1, ['c1', 'c2']))
  })
  afterEach(() => vi.useRealTimers())

  it('números do caderno vêm dos agregados: "Revisar N" = session_count, barra = progress', () => {
    const tc = useTopicCards()
    tc.setSummary(details)
    expect(tc.totalCards.value).toBe(2200)
    expect(tc.pendingCount.value).toBe(317)
    expect(tc.memorizeProgress.value).toBe(57)
    expect(tc.dueCardsCount.value).toBe(277)
    expect(tc.newCardsCount.value).toBe(663)
    expect(tc.weakCardsCount.value).toBe(843)
    expect(apiMock).not.toHaveBeenCalled() // the list only comes with the Cards tab
  })

  it('a lista vem de /topics/x/flashcards uma vez por /details e pagina a partir dela', async () => {
    const tc = useTopicCards()
    tc.setSummary(details)
    await tc.ensureList()
    await tc.ensureList()
    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock).toHaveBeenCalledWith('/topics/x/flashcards', { query: { page: 1, per_page: 50 } })
    expect(tc.listCards.value.map(c => c.id)).toEqual(['c1', 'c2'])
    expect(tc.hasMorePages.value).toBe(true)

    apiMock.mockResolvedValue(page(2, ['c2', 'c3']))
    tc.loadNextPage()
    await vi.advanceTimersByTimeAsync(0)
    expect(apiMock).toHaveBeenLastCalledWith('/topics/x/flashcards', { query: { page: 2, per_page: 50 } })
    expect(tc.listCards.value.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])

    // A new /details (card created, generated) reloads the list on the next ensureList
    tc.setSummary({ ...details, flashcards_count: 2201 })
    expect(tc.listCards.value).toEqual([])
    await tc.ensureList()
    expect(apiMock).toHaveBeenCalledTimes(3)
  })

  it('caderno sem cards: a aba abre sem request', async () => {
    const tc = useTopicCards()
    tc.setSummary({ ...details, flashcards_count: 0 })
    await tc.ensureList()
    expect(apiMock).not.toHaveBeenCalled()
    expect(tc.listCards.value).toEqual([])
  })

  it('busca chama /topics/x/flashcards uma vez após 300 ms de digitação', async () => {
    const tc = useTopicCards()
    tc.setSummary(details)
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

  it('resposta de um caderno anterior não entra na lista do atual', async () => {
    let resolveOld!: (v: unknown) => void
    apiMock.mockReturnValueOnce(new Promise(r => { resolveOld = r }))
    const tc = useTopicCards()
    tc.setSummary(details)
    void tc.ensureList()
    tc.setSummary({ ...details, id: 'y' })
    apiMock.mockResolvedValue(page(1, ['y1']))
    await tc.ensureList()
    resolveOld(page(1, ['velho']))
    await vi.advanceTimersByTimeAsync(0)
    expect(tc.listCards.value.map(c => c.id)).toEqual(['y1'])
  })

  it('"Ver e editar cards" de uma nota: a lista vem filtrada por source_note_id e volta a todos (RF-F4)', async () => {
    const tc = useTopicCards()
    tc.setSummary(details)
    apiMock.mockResolvedValue({ ...page(1, ['n1', 'n2'], 1), meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 } })
    await tc.filterByNote('note-1')
    expect(apiMock).toHaveBeenLastCalledWith('/topics/x/flashcards', { query: { page: 1, per_page: 50, source_note_id: 'note-1' } })
    expect(tc.sourceNoteId.value).toBe('note-1')
    expect(tc.filteredTotal.value).toBe(2)
    expect(tc.totalCards.value).toBe(2200) // the caderno's numbers do not change

    // The search stays inside the note
    tc.searchCards('abc')
    await vi.advanceTimersByTimeAsync(300)
    expect(apiMock).toHaveBeenLastCalledWith('/topics/x/flashcards', { query: { page: 1, per_page: 50, q: 'abc', source_note_id: 'note-1' } })

    apiMock.mockResolvedValue(page(1, ['c1']))
    await tc.filterByNote(null)
    expect(apiMock).toHaveBeenLastCalledWith('/topics/x/flashcards', { query: { page: 1, per_page: 50 } })
    expect(tc.filteredTotal.value).toBeNull()
  })

  it('outro caderno limpa o filtro da nota', async () => {
    const tc = useTopicCards()
    tc.setSummary(details)
    await tc.filterByNote('note-1')
    tc.setSummary({ ...details, id: 'y' })
    expect(tc.sourceNoteId.value).toBeNull()
  })

  it('requisitos do simulado e do podcast vêm do /details (RF-F5)', () => {
    const tc = useTopicCards()
    expect(tc.quizGate.value).toBeNull()
    tc.setSummary({ ...details, can_quiz: { ok: false, code: 'needs_material', requirement: { required: 100, current: 60 } }, can_podcast: { ok: true } })
    expect(tc.quizGate.value).toMatchObject({ ok: false, code: 'needs_material' })
    expect(tc.podcastGate.value).toEqual({ ok: true })
  })
})
