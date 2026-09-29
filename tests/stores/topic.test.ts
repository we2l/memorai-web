import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTopicStore } from '~/stores/topic'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const topic = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id.toUpperCase(), parent_id: null, children: [], notes_count: 0, flashcards_count: 0, ...extra }) as any

describe('topic store — exclusão adiada (RN-UX-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    apiMock.mockReset().mockResolvedValue({})
  })
  afterEach(() => vi.useRealTimers())

  it('remove da árvore na hora e só chama DELETE depois de 10 s', async () => {
    const store = useTopicStore()
    store.tree = [topic('a'), topic('b')]
    store.scheduleRemove(store.tree[0]!)
    expect(store.tree.map(t => t.id)).toEqual(['b'])
    expect(apiMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(apiMock).toHaveBeenCalledWith('/topics/a', expect.objectContaining({ method: 'DELETE' }))
  })

  it('Desfazer restaura na mesma posição sem request', async () => {
    const store = useTopicStore()
    store.tree = [topic('a'), topic('b'), topic('c')]
    store.scheduleRemove(store.tree[1]!)
    expect(store.cancelRemove('b')).toBe(true)
    expect(store.tree.map(t => t.id)).toEqual(['a', 'b', 'c'])
    await vi.advanceTimersByTimeAsync(20_000)
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('flush envia os pendentes na hora (saída da página)', async () => {
    const store = useTopicStore()
    store.tree = [topic('a'), topic('b')]
    store.scheduleRemove(store.tree[0]!)
    await store.flushRemoves()
    expect(apiMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(apiMock).toHaveBeenCalledTimes(1)
  })

  it('falha no DELETE restaura o item', async () => {
    apiMock.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }))
    const store = useTopicStore()
    const child = topic('c1', { parent_id: 'a' })
    store.tree = [topic('a', { children: [child] })]
    store.scheduleRemove(child)
    expect(store.tree[0]!.children).toHaveLength(0)
    await store.flushRemoves()
    expect(store.tree[0]!.children.map((t: any) => t.id)).toEqual(['c1'])
  })

  it('rootOf encontra o caderno raiz', () => {
    const store = useTopicStore()
    store.tree = [topic('a', { children: [topic('c1', { parent_id: 'a', children: [topic('g', { parent_id: 'c1' })] })] })]
    expect(store.rootOf('g')?.id).toBe('a')
  })
})
