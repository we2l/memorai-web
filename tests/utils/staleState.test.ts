import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHUNK_RELOAD_KEY, RELOAD_WINDOW_MS, isChunkLoadError, shouldReloadForChunk } from '~/utils/chunkRecovery'
import { readPending } from '~/stores/player'
import { isDraft } from '~/composables/useNoteDraft'

// What a device of the previous release can bring: a chunk that no longer exists and storage in another shape
describe('estado velho: chunk de outra versão', () => {
  afterEach(() => sessionStorage.clear())

  it('reconhece a falha de import nas palavras do Chrome, do Firefox e do Safari', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://baigi.com.br/_nuxt/Ab12.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: https://baigi.com.br/_nuxt/Ab12.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError({ message: 'Unable to preload CSS for /_nuxt/x.css' })).toBe(true)
    expect(isChunkLoadError(new Error('Request failed with status 500'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  it('recarrega uma vez e não de novo dentro da janela (sem laço)', () => {
    const t = 1_000_000
    expect(shouldReloadForChunk(t)).toBe(true)
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe(String(t))
    expect(shouldReloadForChunk(t + 1000)).toBe(false)
    expect(shouldReloadForChunk(t + RELOAD_WINDOW_MS + 1)).toBe(true)
  })

  it('ignora uma marca ilegível', () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, 'lixo')
    expect(shouldReloadForChunk(5000)).toBe(true)
  })
})

describe('estado velho: localStorage em outro formato', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in, as in auth-pending-logout.test.ts
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('posições do podcast: descarta o que não é número e o JSON quebrado', () => {
    localStorage.setItem('baigi-podcast-progress-pending', JSON.stringify({ a: { position: 42, completed: true }, b: 'lixo', c: { position: '10' }, d: null, e: { position: -1 } }))
    expect(readPending()).toEqual({ a: { position: 42, completed: true } })
    localStorage.setItem('baigi-podcast-progress-pending', '{lixo')
    expect(readPending()).toEqual({})
    localStorage.setItem('baigi-podcast-progress-pending', '[1,2]')
    expect(readPending()).toEqual({})
  })

  it('rascunho de nota: só abre um documento do Tiptap', () => {
    expect(isDraft({ content: { type: 'doc', content: [] }, title: 'A', savedAt: 1 })).toBe(true)
    expect(isDraft({ content: null, title: '', savedAt: 1 })).toBe(true)
    expect(isDraft({ content: '<p>html antigo</p>', title: 'A', savedAt: 1 })).toBe(false)
    expect(isDraft({ content: { type: 'doc' }, savedAt: 1 })).toBe(false)
    expect(isDraft({ content: { type: 'doc' }, title: 'A', savedAt: '1' })).toBe(false)
    expect(isDraft('lixo')).toBe(false)
  })
})
