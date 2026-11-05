import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTopicStore } from '~/stores/topic'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const topic = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id.toUpperCase(), parent_id: null, children: [], notes_count: 0, flashcards_count: 0, ...extra }) as any

describe('topic store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('remove manda para a lixeira na hora e devolve o recibo com o lote (RF-F16)', async () => {
    const receipt = { trash_batch_id: 'tb1', purge_at: '2026-12-02T03:00:00Z', counts: { subjects: 0, materials: 0, cards: 2 } }
    apiMock.mockImplementation((url: string, opts?: { method?: string }) => (opts?.method === 'DELETE' ? Promise.resolve({ data: receipt }) : Promise.resolve({ data: [topic('b')] })))
    const store = useTopicStore()
    store.tree = [topic('a'), topic('b')]
    store.current = store.tree[0]!
    await expect(store.remove('a')).resolves.toEqual(receipt)
    expect(apiMock).toHaveBeenCalledWith('/topics/a', expect.objectContaining({ method: 'DELETE' }))
    expect(store.tree.map(t => t.id)).toEqual(['b'])
    expect(store.current).toBeNull()
  })

  it('falha no DELETE: a árvore fica como estava e o erro sobe para quem chamou', async () => {
    apiMock.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 500 } }))
    const store = useTopicStore()
    store.tree = [topic('a')]
    await expect(store.remove('a')).rejects.toThrow('x')
    expect(store.tree.map(t => t.id)).toEqual(['a'])
  })

  it('rootOf encontra o caderno raiz', () => {
    const store = useTopicStore()
    store.tree = [topic('a', { children: [topic('c1', { parent_id: 'a', children: [topic('g', { parent_id: 'c1' })] })] })]
    expect(store.rootOf('g')?.id).toBe('a')
  })
})
