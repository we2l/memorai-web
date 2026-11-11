import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { useReviewStore, OFFLINE_AGAIN_MS } from '~/stores/review'
import { useOfflineStore } from '~/stores/offline'
import { useAuthStore } from '~/stores/auth'
import { studyDay } from '~/utils/greeting'

// Offline review (prd-revisao-offline RF-F3..F5): the queue in IndexedDB (mocked in memory here; the real database
// runs in e2e/auditoria/revisao-offline.spec.ts), the pause without network, the saved lot and "Não lembrei".
const { apiMock, db, toastShow } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  toastShow: vi.fn(),
  db: { queue: new Map<string, any>(), session: new Map<string, any>(), meta: new Map<string, any>() },
}))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', () => () => ({ show: toastShow, toasts: { value: [] }, dismiss: vi.fn() }))

vi.mock('~/utils/offlineDb', () => ({
  offlineDbReady: async () => true,
  queuePut: async (item: any) => { db.queue.set(item.client_id, { ...item }) },
  queueDelete: async (id: string) => { db.queue.delete(id) },
  queueForUser: async (user: string) => [...db.queue.values()].filter(r => r.user_id === user).sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at)),
  queuePurgeOlderThan: async () => 0,
  sessionKey: (user: string, query: string) => `${user}|${query}`,
  sessionGet: async (key: string) => db.session.get(key),
  sessionPut: async (row: any) => { db.session.set(row.key, row) },
  sessionMarkRated: async (user: string, cardId: string) => {
    for (const r of db.session.values()) if (r.user_id === user && !r.rated.includes(cardId)) r.rated.push(cardId)
  },
  metaGet: async (key: string) => db.meta.get(key),
  metaPut: async (key: string, value: unknown) => { db.meta.set(key, value) },
  metaDelete: async (key: string) => { db.meta.delete(key) },
  forgetAccountCache: async () => {},
  deleteOfflineDb: async () => {},
  askPersistentStorage: vi.fn(),
}))

const intervals = { again: '1min', hard: '6min', good: '10min', easy: '4d' }
const card = (id: string, extra: Record<string, unknown> = {}) => ({ id, state: 'review', due: null, is_learning: false, next_intervals: intervals, ...extra }) as any
const answer = (id: string, reviewId: string, extra: Record<string, unknown> = {}) => ({
  data: { flashcard: { id, state: 'review', due: null, is_learning: false, ...extra }, review: { id: reviewId }, next_intervals: intervals },
})
const networkError = () => new TypeError('Failed to fetch') // no HTTP status (D10)
const httpError = (status: number, code?: string) => Object.assign(new Error(`HTTP ${status}`), { response: { status }, data: code ? { code } : {} })

function setup() {
  setActivePinia(createPinia())
  db.queue.clear(); db.session.clear(); db.meta.clear()
  apiMock.mockReset(); toastShow.mockReset()
  useAuthStore().user = { id: 'u1', review_batch_size: 20 } as any
  return useReviewStore()
}

describe('fila persistente (RF-F4)', () => {
  beforeEach(() => { setup() })

  it('cada avaliação vai ao IndexedDB com reviewed_at antes do envio e sai com o 2xx', async () => {
    const store = useReviewStore()
    store.cards = [card('a')]
    let seen: any = null
    apiMock.mockImplementationOnce(async (_url: string, opts: any) => {
      seen = { stored: [...db.queue.values()], body: opts.body }
      return answer('a', 'r1')
    })
    store.rate(3)
    await flushPromises()

    expect(seen.stored).toHaveLength(1)
    expect(seen.stored[0]).toMatchObject({ user_id: 'u1', flashcard_id: 'a', rating: 3 })
    expect(seen.body.reviewed_at).toBe(seen.stored[0].reviewed_at)
    expect(typeof seen.body.client_sent_at).toBe('string')
    await vi.waitFor(() => expect(db.queue.size).toBe(0))
  })

  it('sem rede: para sem gastar tentativa, marca offline e mantém a fila; com rede, envia em ordem', async () => {
    const store = useReviewStore()
    const offline = useOfflineStore()
    store.cards = [card('a'), card('b')]
    apiMock.mockRejectedValue(networkError())
    store.rate(3)
    await flushPromises()
    store.rate(1)
    await flushPromises()

    expect(offline.offline).toBe(true)
    expect(store.queuePaused).toBe(false)
    expect(store.reviewQueue.map(q => [q.flashcard_id, q.attempts])).toEqual([['a', 0], ['b', 0]])
    expect(db.queue.size).toBe(2)
    expect(offline.pending).toBe(2)

    apiMock.mockReset()
    apiMock.mockResolvedValueOnce(answer('a', 'r1')).mockResolvedValueOnce(answer('b', 'r2'))
    await store.processQueue()
    await flushPromises()

    expect(apiMock.mock.calls.map(c => c[1].body.flashcard_id)).toEqual(['a', 'b'])
    expect(offline.offline).toBe(false)
    expect(offline.serverDown).toBe(false)
    await vi.waitFor(() => expect(db.queue.size).toBe(0))
    expect(toastShow).toHaveBeenCalledWith('Avaliações sincronizadas.', 'success')
  })

  it('422 review_too_old descarta com aviso; 401 deixa no aparelho para a mesma conta', async () => {
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    apiMock.mockRejectedValueOnce(httpError(422, 'review_too_old'))
    store.rate(3)
    await flushPromises()
    await vi.waitFor(() => expect(db.queue.size).toBe(0))
    expect(toastShow).toHaveBeenCalledWith(expect.stringContaining('mais de 7 dias'), 'warning')

    apiMock.mockRejectedValueOnce(httpError(401))
    store.rate(3)
    await flushPromises()
    expect(store.reviewQueue).toHaveLength(0)
    expect(db.queue.size).toBe(1)
  })

  it('desfazer o que ainda espera tira da fila e do IndexedDB, sem ir ao servidor', async () => {
    const store = useReviewStore()
    store.cards = [card('a')]
    apiMock.mockRejectedValue(networkError())
    store.rate(3)
    await flushPromises()

    expect(await store.undo()).toBe(true)
    await flushPromises()
    expect(store.reviewQueue).toHaveLength(0)
    await vi.waitFor(() => expect(db.queue.size).toBe(0))
    expect(store.currentCard?.id).toBe('a')
  })

  it('o que outra página deixou no aparelho volta à fila desta conta e sobe fora da sessão', async () => {
    const store = useReviewStore()
    db.queue.set('x', { client_id: 'x', user_id: 'u1', flashcard_id: 'old', rating: 3, reviewed_at: '2026-11-10T07:00:00.000Z' })
    db.queue.set('y', { client_id: 'y', user_id: 'u2', flashcard_id: 'other', rating: 3, reviewed_at: '2026-11-10T06:00:00.000Z' })
    apiMock.mockResolvedValueOnce(answer('old', 'r9', { is_learning: true, due: new Date().toISOString() }))

    await store.resumeStoredQueue('u1')
    await flushPromises()

    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock.mock.calls[0]![1].body).toMatchObject({ client_id: 'x', reviewed_at: '2026-11-10T07:00:00.000Z' })
    expect(store.learningQueue).toHaveLength(0) // not a card of this session
    await vi.waitFor(() => expect([...db.queue.keys()]).toEqual(['y']))
  })
})

describe('revisar sem rede (RF-F3, RF-F5)', () => {
  beforeEach(() => { setup() })

  it('abre o lote salvo de hoje desta conta, sem os cards já avaliados nem os da fila', async () => {
    const store = useReviewStore()
    db.session.set('u1|', { key: 'u1|', user_id: 'u1', day: studyDay(), res: { data: [card('a'), card('b'), card('c')], session_count: 3 }, rated: ['a'], saved_at: 0 })
    db.queue.set('q', { client_id: 'q', user_id: 'u1', flashcard_id: 'b', rating: 3, reviewed_at: new Date().toISOString() })
    apiMock.mockRejectedValue(networkError())

    await store.fetchSession()

    expect(store.sessionError).toBeNull()
    expect(store.cards.map(c => c.id)).toEqual(['c'])
    expect(store.hasMore).toBe(false)
    expect(useOfflineStore().offline).toBe(true)
  })

  it('lote de outro dia ou sem lote: o erro de sempre', async () => {
    const store = useReviewStore()
    db.session.set('u1|', { key: 'u1|', user_id: 'u1', day: '2020-01-01', res: { data: [card('a')] }, rated: [], saved_at: 0 })
    apiMock.mockRejectedValue(networkError())

    await store.fetchSession()

    expect(store.sessionError).not.toBeNull()
    expect(store.cards).toEqual([])
  })

  it('online, a 1ª página fica guardada para a mesma conta e o mesmo recorte', async () => {
    const store = useReviewStore()
    apiMock.mockResolvedValueOnce({ data: [card('a')], session_count: 1, has_more: false })

    await store.fetchSession({ topicId: 't1' })
    await flushPromises()

    const [row] = [...db.session.values()]
    expect(row).toMatchObject({ user_id: 'u1', day: studyDay(), rated: [] })
    expect(row.key).toBe(`u1|${store.sessionQuery}`)
  })

  it('"Não lembrei" sem rede volta no fim do lote em 1 min, e a resposta do servidor não duplica', async () => {
    const store = useReviewStore()
    store.errorDiaryMode = 'never'
    store.cards = [card('a'), card('b')]
    apiMock.mockRejectedValue(networkError())
    useOfflineStore().markOffline()
    const before = Date.now()

    store.rate(1)
    await flushPromises()

    expect(store.learningQueue.map(q => q.card.id)).toEqual(['a'])
    expect(store.learningQueue[0]!.dueAt).toBeGreaterThanOrEqual(before + OFFLINE_AGAIN_MS)
    expect(store.currentCard?.id).toBe('b')

    apiMock.mockReset()
    apiMock.mockResolvedValueOnce(answer('a', 'r1', { is_learning: true, state: 'relearning', due: new Date(Date.now() + 600_000).toISOString() }))
    await store.processQueue()

    expect(store.learningQueue.map(q => q.card.id)).toEqual(['a'])
    expect(store.learningQueue[0]!.card.state).toBe('relearning')
  })

  it('o fim não espera o envio sem rede', async () => {
    const store = useReviewStore()
    store.cards = [card('a')]
    apiMock.mockRejectedValue(networkError())
    store.rate(3)
    await flushPromises()

    expect(store.reviewQueue).toHaveLength(1)
    expect(store.saving).toBe(false)
    expect(store.finished).toBe(true)
  })
})

describe('conta sem rede (RF-F2)', () => {
  beforeEach(() => { setup() })

  it('com a dica de sessão, /me sem rede abre o app com o último usuário guardado', async () => {
    const auth = useAuthStore()
    auth.user = null
    db.meta.set('user', 'u1')
    db.meta.set('user:u1', { id: 'u1', name: 'Ana' })
    document.cookie = 'baigi_logged_in=1; path=/'
    apiMock.mockRejectedValueOnce(networkError())

    await auth.fetchMe()

    expect(auth.user?.id).toBe('u1')
    expect(auth.offline).toBe(true)
    expect(useOfflineStore().offline).toBe(true)
    document.cookie = 'baigi_logged_in=; path=/; max-age=0'
  })

  it('sem a dica, nada abre', async () => {
    const auth = useAuthStore()
    auth.user = null
    db.meta.set('user', 'u1')
    db.meta.set('user:u1', { id: 'u1' })
    apiMock.mockRejectedValueOnce(networkError())

    await auth.fetchMe()

    expect(auth.user).toBeNull()
  })
})

describe('servidor inacessível com o navegador online (QA M3)', () => {
  beforeEach(() => { setup(); vi.restoreAllMocks() })

  it('a fila fica, o motivo é o servidor e "Tentar de novo" envia na hora, mesmo com a fila pausada', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const store = useReviewStore()
    const offline = useOfflineStore()
    store.cards = [card('a')]
    apiMock.mockRejectedValue(networkError())
    store.rate(3)
    await flushPromises()

    expect(offline.offline).toBe(true)
    expect(offline.serverDown).toBe(true)
    expect(store.reviewQueue).toHaveLength(1)

    store.queuePaused = true
    apiMock.mockReset()
    apiMock.mockResolvedValueOnce(answer('a', 'r1'))
    await offline.retryNow()
    await vi.waitFor(() => expect(store.reviewQueue).toHaveLength(0))
    expect(offline.offline).toBe(false)
    expect(offline.serverDown).toBe(false)
  })

  it('sem conexão no navegador, o motivo é a internet', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const store = useReviewStore()
    store.cards = [card('a')]
    apiMock.mockRejectedValue(networkError())
    store.rate(3)
    await flushPromises()
    expect(useOfflineStore().offline).toBe(true)
    expect(useOfflineStore().serverDown).toBe(false)
  })
})
