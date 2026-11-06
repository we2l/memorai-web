import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useNoteStore } from '~/stores/note'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const item = (id: string, extra: Record<string, unknown> = {}) => ({ id, topic_id: 't1', title: id, word_count: 10, plain_preview: 'x', flashcards_count: 4, updated_at: '2026-11-01T10:00:00Z', ...extra })

describe('note store (lista sem content, prd-performance-caderno)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('PUT: junta a resposta leve ao item da lista e à nota aberta, sem guardar content', async () => {
    const store = useNoteStore()
    store.notes = [item('n1')] as any
    store.current = item('n1') as any
    apiMock.mockResolvedValue({ data: { id: 'n1', title: 'Novo', word_count: 46325, plain_preview: 'p', updated_at: '2026-11-01T11:00:00Z' } })
    await store.update('n1', { title: 'Novo', content: doc('texto') })
    expect(store.notes[0]).toEqual({ ...item('n1'), title: 'Novo', word_count: 46325, plain_preview: 'p', updated_at: '2026-11-01T11:00:00Z' })
    expect(store.notes[0]).not.toHaveProperty('content')
    expect(store.current).toMatchObject({ title: 'Novo', updated_at: '2026-11-01T11:00:00Z' })
    // flashcards_count is not in the PUT answer: the list keeps its own
    expect(store.notes[0]!.flashcards_count).toBe(4)
  })

  it('criar: a lista recebe o resumo e o editor a nota completa', async () => {
    const store = useNoteStore()
    apiMock.mockResolvedValue({ data: { ...item('n9', { flashcards_count: undefined }), content: doc('') } })
    const note = await store.create('t1', { title: 'Novo material' })
    expect(note.content).toEqual(doc(''))
    expect(store.notes[0]).not.toHaveProperty('content')
    expect(store.notes[0]!.flashcards_count).toBe(0)
  })

  it('uma lista atrasada do caderno anterior não substitui a do atual', async () => {
    const store = useNoteStore()
    let resolveOld!: (v: unknown) => void
    apiMock.mockReturnValueOnce(new Promise(r => { resolveOld = r })).mockResolvedValueOnce({ data: [item('b1')] })
    const old = store.fetchForTopic('a')
    await store.fetchForTopic('b')
    resolveOld({ data: [item('a1')] })
    await old
    expect(store.notes.map(n => n.id)).toEqual(['b1'])
    expect(store.loading).toBe(false)
  })
})
