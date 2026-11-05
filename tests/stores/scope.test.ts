import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { documentRowStatus, useScopeStore } from '~/stores/scope'
import type { MaterialRow } from '~/types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const row = (id: string, extra: Partial<MaterialRow> = {}): MaterialRow => ({
  kind: 'note', id, note_id: id, title: id, topic: { id: 't1', name: 'TRF' }, pages: null, parts: null, words: 100,
  cards: 0, mastery: null, session_count: 0, ahead_count: 0, status: 'ready', progress: null, updated_at: '2026-11-01T00:00:00Z', ...extra,
})
const summary = { topic: { id: 't1', name: 'TRF', depth: 0 }, session: { count: 3 } }

function routeApi(pages: Record<string, { data: MaterialRow[], meta: { next_cursor: string | null, total: number } }>) {
  apiMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/summary')) return { data: summary }
    const cursor = new URL(url, 'http://x').searchParams.get('cursor') ?? 'first'
    return pages[cursor]
  })
}

describe('scope store (prd-4b-caderno-v3 tasks 6.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('abrir pede só o resumo e a 1ª página de materiais, em paralelo (sem conteúdo de nota nem cards)', async () => {
    routeApi({ first: { data: [row('a'), row('b')], meta: { next_cursor: 'c2', total: 3 } } })
    const store = useScopeStore()
    await store.open('t1')
    const urls = apiMock.mock.calls.map(c => c[0])
    expect(urls).toEqual(['/topics/t1/summary', '/topics/t1/materials?limit=30'])
    expect(store.summary?.session.count).toBe(3)
    expect(store.materials.map(r => r.id)).toEqual(['a', 'b'])
    expect(store.hasMore).toBe(true)
    expect(store.total).toBe(3)
  })

  it('"Carregar mais" junta a página seguinte pelo cursor, sem repetir linhas', async () => {
    routeApi({
      first: { data: [row('a'), row('b')], meta: { next_cursor: 'c2', total: 3 } },
      c2: { data: [row('b'), row('c')], meta: { next_cursor: null, total: 3 } },
    })
    const store = useScopeStore()
    await store.open('t1')
    expect(await store.loadMore()).toBe(1)
    expect(store.materials.map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(store.hasMore).toBe(false)
    expect(apiMock.mock.calls.at(-1)![0]).toBe('/topics/t1/materials?limit=30&cursor=c2')
  })

  it('busca (≥ 2 letras), ordem e matéria vão para o servidor e recomeçam a lista', async () => {
    routeApi({ first: { data: [row('a')], meta: { next_cursor: null, total: 1 } } })
    const store = useScopeStore()
    await store.open('t1')
    await store.setQuery({ q: 'a' })
    expect(apiMock.mock.calls.at(-1)![0]).toBe('/topics/t1/materials?limit=30')
    await store.setQuery({ q: 'apostila', sort: 'name', subjectId: 's9' })
    expect(apiMock.mock.calls.at(-1)![0]).toBe('/topics/t1/materials?limit=30&q=apostila&sort=name&subject_id=s9')
  })

  it('404 do resumo = caderno não encontrado; outro erro fica no bloco', async () => {
    apiMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/summary')) throw Object.assign(new Error('nf'), { response: { status: 404 }, statusCode: 404 })
      throw Object.assign(new Error('x'), { response: { status: 500 }, statusCode: 500 })
    })
    const store = useScopeStore()
    await store.open('t1')
    expect(store.notFound).toBe(true)
    expect(store.materialsError).toBeTruthy()
  })

  it('outro escopo começa limpo; o mesmo escopo mantém o que está na tela enquanto atualiza', async () => {
    routeApi({ first: { data: [row('a')], meta: { next_cursor: null, total: 1 } } })
    const store = useScopeStore()
    await store.open('t1')
    await store.setQuery({ q: 'apostila' })
    const reopening = store.open('t1')
    expect(store.materials).toHaveLength(1)
    await reopening
    expect(store.query.q).toBe('apostila')
    void store.open('t2')
    expect(store.materials).toEqual([])
    expect(store.query.q).toBe('')
  })

  it('PDF lendo: só a linha dele muda; adicionado aqui entra no topo', async () => {
    routeApi({ first: { data: [row('a'), row('d1', { kind: 'pdf', status: 'generating' })], meta: { next_cursor: null, total: 2 } } })
    const store = useScopeStore()
    await store.open('t1')
    const status = store.applyDocument({ id: 'd1', status: 'completed', note_generation_status: 'generating', note_generation_progress: 3, note_total_batches: 12 } as any)
    expect(status).toBe('generating')
    expect(store.materials[1]!.progress).toEqual({ done: 3, total: 12 })
    store.prependRow(row('n2'))
    expect(store.materials.map(r => r.id)).toEqual(['n2', 'a', 'd1'])
    expect(store.total).toBe(3)
    store.removeRow('note', 'a')
    expect(store.materials.map(r => r.id)).toEqual(['n2', 'd1'])
  })

  it('estado da linha do PDF = a regra da API (MaterialService::documentStatus)', () => {
    expect(documentRowStatus({ status: 'failed', note_generation_status: null })).toBe('failed')
    expect(documentRowStatus({ status: 'completed', note_generation_status: 'failed' })).toBe('failed')
    expect(documentRowStatus({ status: 'completed', note_generation_status: 'generating' })).toBe('generating')
    expect(documentRowStatus({ status: 'processing', note_generation_status: 'generating' })).toBe('processing')
    expect(documentRowStatus({ status: 'processing', note_generation_status: null })).toBe('processing')
    expect(documentRowStatus({ status: 'completed', note_generation_status: null })).toBe('blocked')
    expect(documentRowStatus({ status: 'completed', note_generation_status: 'completed' })).toBe('ready')
  })
})

describe('scope store: refresh com filtro de matéria (4b-2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('a matéria do filtro saiu do escopo: o filtro cai antes de pedir os materiais', async () => {
    const urls: string[] = []
    apiMock.mockImplementation((url: string) => {
      urls.push(url)
      if (url.endsWith('/summary')) return Promise.resolve({ data: { subjects: [{ id: 'outra' }] } })
      return Promise.resolve({ data: [], meta: { next_cursor: null, total: 0 } })
    })
    const store = useScopeStore()
    await store.open('t1')
    await store.setQuery({ subjectId: 'gone' })
    urls.length = 0
    await store.refresh()
    expect(store.query.subjectId).toBe('')
    expect(urls.some(u => u.includes('subject_id'))).toBe(false)
  })

  it('a matéria continua no escopo: o filtro fica', async () => {
    apiMock.mockImplementation((url: string) => (url.endsWith('/summary')
      ? Promise.resolve({ data: { subjects: [{ id: 'm1' }] } })
      : Promise.resolve({ data: [], meta: { next_cursor: null, total: 0 } })))
    const store = useScopeStore()
    await store.open('t1')
    await store.setQuery({ subjectId: 'm1' })
    await store.refresh()
    expect(store.query.subjectId).toBe('m1')
  })
})
