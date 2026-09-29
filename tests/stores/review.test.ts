import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useReviewStore, shouldOpenDiary } from '~/stores/review'
import { useToast } from '~/composables/useToast'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const intervals = { again: '1min', hard: '6min', good: '10min', easy: '4d' }
const card = (id: string, extra: Record<string, unknown> = {}) => ({ id, state: 'review', due: null, is_learning: false, next_intervals: intervals, ...extra }) as any
const answer = (id: string, reviewId: string, extra: Record<string, unknown> = {}) => ({
  data: { flashcard: { id, state: 'review', due: null, is_learning: false, ...extra }, review: { id: reviewId }, next_intervals: intervals },
})
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } })

describe('useReviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty state', () => {
    const store = useReviewStore()
    expect(store.cards).toEqual([])
    expect(store.currentIndex).toBe(0)
    expect(store.flipped).toBe(false)
    expect(store.finished).toBe(false)
    expect(store.noteSnippet).toBeNull()
  })

  it('currentCard returns null when empty', () => {
    const store = useReviewStore()
    expect(store.currentCard).toBeNull()
  })

  it('progress is 0 when empty', () => {
    const store = useReviewStore()
    expect(store.progress).toBe(0)
  })

  it('flip sets flipped to true', () => {
    const store = useReviewStore()
    store.flip()
    expect(store.flipped).toBe(true)
  })

  it('currentCard returns from main queue', () => {
    const store = useReviewStore()
    const card = { id: '1', next_intervals: { again: '1min', hard: '1min', good: '10min', easy: '8d' } } as any
    store.cards = [card]
    expect(store.currentCard?.id).toBe('1')
  })

  it('currentCard returns due learning card over main queue', () => {
    const store = useReviewStore()
    const mainCard = { id: 'main', next_intervals: {} } as any
    const learnCard = { id: 'learn', next_intervals: {} } as any
    store.cards = [mainCard]
    store.learningQueue = [{ card: learnCard, dueAt: Date.now() - 1000 }]
    expect(store.currentCard?.id).toBe('learn')
  })

  it('currentCard skips future learning cards', () => {
    const store = useReviewStore()
    const mainCard = { id: 'main', next_intervals: {} } as any
    const futureCard = { id: 'future', next_intervals: {} } as any
    store.cards = [mainCard]
    store.learningQueue = [{ card: futureCard, dueAt: Date.now() + 60000 }]
    expect(store.currentCard?.id).toBe('main')
  })

  it('checkFinished does not finish when learning queue has items', () => {
    const store = useReviewStore()
    store.cards = [{ id: '1' } as any]
    store.currentIndex = 1
    store.learningQueue = [{ card: { id: '2' } as any, dueAt: Date.now() + 60000 }]
    store.checkFinished()
    expect(store.finished).toBe(false)
  })

  it('checkFinished finishes when both queues empty', () => {
    const store = useReviewStore()
    store.cards = [{ id: '1' } as any]
    store.currentIndex = 1
    store.learningQueue = []
    store.checkFinished()
    expect(store.finished).toBe(true)
  })

  it('pendingLearning returns queue length', () => {
    const store = useReviewStore()
    store.learningQueue = [
      { card: {} as any, dueAt: Date.now() },
      { card: {} as any, dueAt: Date.now() },
    ]
    expect(store.pendingLearning).toBe(2)
  })

  it('_tick is reactive for learning queue re-evaluation', () => {
    const store = useReviewStore()
    expect(store._tick).toBe(0)
    store._tick++
    expect(store._tick).toBe(1)
  })
})

describe('useReviewStore — fila otimista (RF-F2.3/F2.4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
    const t = useToast()
    for (const i of [...t.state.items]) t.dismiss(i.id)
  })

  it('avança na hora, sem esperar a API', () => {
    apiMock.mockReturnValue(new Promise(() => {}))
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.flipped = true
    store.rate(3)
    expect(store.currentCard?.id).toBe('b')
    expect(store.flipped).toBe(false)
    expect(store.pendingCount).toBe(1)
  })

  it('envia serialmente e em ordem (2 rates rápidos → 2 requests)', async () => {
    const first = deferred<any>()
    apiMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(answer('b', 'r2'))
    const store = useReviewStore()
    store.errorDiaryMode = 'never'
    store.cards = [card('a'), card('b')]
    store.rate(3)
    store.rate(1)
    await Promise.resolve()
    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock.mock.calls[0]![1].body).toMatchObject({ flashcard_id: 'a', rating: 3 })
    first.resolve(answer('a', 'r1'))
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(2))
    expect(apiMock.mock.calls[1]![1].body).toMatchObject({ flashcard_id: 'b', rating: 1 })
    await vi.waitFor(() => expect(store.pendingCount).toBe(0))
  })

  it('refaz com o mesmo client_id (backoff) e pausa após 3 falhas', async () => {
    vi.useFakeTimers()
    apiMock.mockRejectedValue(httpError(503))
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.rate(3)
    await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 10)
    expect(apiMock).toHaveBeenCalledTimes(4)
    const ids = apiMock.mock.calls.map(c => c[1].body.client_id)
    expect(new Set(ids).size).toBe(1)
    expect(store.queuePaused).toBe(true)

    apiMock.mockReset().mockResolvedValue(answer('a', 'r1'))
    store.retryQueue()
    await vi.advanceTimersByTimeAsync(10)
    expect(apiMock.mock.calls[0]![1].body.client_id).toBe(ids[0])
    expect(store.pendingCount).toBe(0)
    expect(store.queuePaused).toBe(false)
  })

  it('4xx descarta o item com aviso e segue', async () => {
    apiMock.mockRejectedValueOnce(httpError(404)).mockResolvedValue(answer('b', 'r2'))
    const store = useReviewStore()
    store.cards = [card('a'), card('b'), card('c')]
    store.rate(3)
    store.rate(3)
    await vi.waitFor(() => expect(store.pendingCount).toBe(0))
    expect(apiMock).toHaveBeenCalledTimes(2)
    expect(useToast().state.items.some(i => i.type === 'warning')).toBe(true)
  })

  it('card avaliado não reaparece antes da resposta; em aprendizado volta com o due do servidor', async () => {
    const res = deferred<any>()
    apiMock.mockReturnValueOnce(res.promise)
    const store = useReviewStore()
    store.errorDiaryMode = 'never'
    store.cards = [card('a', { state: 'learning', is_learning: true })]
    store.rate(1)
    expect(store.currentCard).toBeNull()
    expect(store.learningQueue).toHaveLength(0)
    res.resolve(answer('a', 'r1', { state: 'learning', is_learning: true, due: new Date(Date.now() + 60_000).toISOString() }))
    await vi.waitFor(() => expect(store.learningQueue).toHaveLength(1))
    expect(store.currentCard?.id).toBe('a')
  })

  it('finished só depois que a fila esvazia', async () => {
    const res = deferred<any>()
    apiMock.mockReturnValueOnce(res.promise)
    const store = useReviewStore()
    store.cards = [card('a')]
    store.rate(3)
    expect(store.finished).toBe(false)
    expect(store.saving).toBe(true)
    res.resolve(answer('a', 'r1'))
    await vi.waitFor(() => expect(store.finished).toBe(true))
  })

  it('erro ao carregar a sessão não vira "Tudo em dia"', async () => {
    apiMock.mockRejectedValue(httpError(500))
    const store = useReviewStore()
    await store.fetchSession()
    expect(store.sessionError).toBeTruthy()
    expect(store.finished).toBe(false)

    apiMock.mockReset().mockResolvedValue({ data: [] })
    await store.fetchSession()
    expect(store.sessionError).toBeNull()
    expect(store.finished).toBe(true)
  })
})

describe('useReviewStore — desfazer (RF-F2.5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('item ainda na fila: undo local, sem request', async () => {
    const first = deferred<any>()
    apiMock.mockReturnValueOnce(first.promise)
    const store = useReviewStore()
    store.cards = [card('a'), card('b'), card('c')]
    store.rate(3) // a → sending
    store.rate(4) // b → queued
    expect(await store.undo()).toBe(true)
    expect(store.currentCard?.id).toBe('b')
    expect(store.pendingCount).toBe(1)
    first.resolve(answer('a', 'r1'))
    await vi.waitFor(() => expect(store.pendingCount).toBe(0))
    expect(apiMock).toHaveBeenCalledTimes(1)
  })

  it('já enviado: chama a API e restaura o card não virado', async () => {
    apiMock.mockResolvedValueOnce(answer('a', 'r1'))
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.flipped = true
    store.rate(3)
    await vi.waitFor(() => expect(store.pendingCount).toBe(0))
    apiMock.mockResolvedValueOnce({ data: { flashcard: { id: 'a', state: 'review', reps: 3 }, next_intervals: intervals, undone_review_id: 'r1' } })
    expect(await store.undo()).toBe(true)
    expect(apiMock.mock.calls[1]![0]).toBe('/reviews/r1/undo')
    expect(store.currentCard?.id).toBe('a')
    expect(store.flipped).toBe(false)
    expect(store.canUndo).toBe(false)
  })

  it('409: avisa e tira da pilha sem restaurar', async () => {
    apiMock.mockResolvedValueOnce(answer('a', 'r1'))
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.rate(3)
    await vi.waitFor(() => expect(store.pendingCount).toBe(0))
    apiMock.mockRejectedValueOnce(httpError(409))
    expect(await store.undo()).toBe(false)
    expect(store.canUndo).toBe(false)
    expect(store.currentCard?.id).toBe('b')
    expect(useToast().state.items.some(i => i.message.includes('desfazer'))).toBe(true)
  })

  it('pilha limitada a 10', () => {
    apiMock.mockReturnValue(new Promise(() => {}))
    const store = useReviewStore()
    store.cards = Array.from({ length: 12 }, (_, i) => card(`c${i}`))
    for (let i = 0; i < 12; i++) store.rate(3)
    expect(store.undoStack).toHaveLength(10)
  })
})

describe('diário de erros (RN-UX-04)', () => {
  it('sometimes abre nos erros 1 e 4, não no 2', () => {
    expect(shouldOpenDiary('sometimes', 1)).toBe(true)
    expect(shouldOpenDiary('sometimes', 2)).toBe(false)
    expect(shouldOpenDiary('sometimes', 3)).toBe(false)
    expect(shouldOpenDiary('sometimes', 4)).toBe(true)
    expect(shouldOpenDiary('always', 2)).toBe(true)
    expect(shouldOpenDiary('never', 1)).toBe(false)
  })

  it('diário não bloqueia: Pular avança', () => {
    setActivePinia(createPinia())
    apiMock.mockReset().mockReturnValue(new Promise(() => {}))
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.rate(1)
    expect(store.showErrorDiary).toBe(true)
    expect(store.diary?.flashcard_id).toBe('a')
    store.dismissDiary()
    expect(store.currentCard?.id).toBe('b')
  })
})
