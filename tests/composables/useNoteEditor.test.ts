import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, ref, type EffectScope } from 'vue'
import { useNoteEditor } from '~/composables/useNoteEditor'
import { useNoteStore } from '~/stores/note'
import { useAuthStore } from '~/stores/auth'
import type { Note, NoteSummary } from '~/types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })
const note = { id: 'n1', title: 'Nota', content: doc('início'), updated_at: '2026-11-01T10:00:00Z' } as unknown as Note
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status }, statusCode: status })
const puts = () => apiMock.mock.calls.filter(([url, opts]) => url === '/notes/n1' && opts?.method === 'PUT')

describe('useNoteEditor autosave', () => {
  let scope: EffectScope
  let editor: ReturnType<typeof useNoteEditor>

  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
    useNoteStore().$reset()
    useNoteStore().notes = [note]
    scope = effectScope()
    editor = scope.run(() => useNoteEditor(ref('t1')))!
    editor.selectNote(note)
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  function type(text: string) {
    editor.noteContent.value = doc(text)
    editor.debouncedSave()
  }

  it('debounce: "saving" while pending, "saved" only after the PUT succeeds', async () => {
    apiMock.mockResolvedValue({ data: {} })
    type('início editado')
    expect(editor.saveState.value).toBe('saving')
    await vi.advanceTimersByTimeAsync(999)
    expect(puts()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(puts()).toHaveLength(1)
    expect(editor.saveState.value).toBe('saved')
  })

  it('PUT 500 → "error", then retries the same content after 2 s and recovers', async () => {
    apiMock.mockRejectedValueOnce(httpError(500)).mockResolvedValue({ data: {} })
    type('texto que falhou')
    await vi.advanceTimersByTimeAsync(1000)
    expect(editor.saveState.value).toBe('error')

    await vi.advanceTimersByTimeAsync(1999)
    expect(puts()).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(puts()).toHaveLength(2)
    expect(JSON.stringify(puts()[1]![1].body)).toContain('texto que falhou')
    expect(editor.saveState.value).toBe('saved')
  })

  it('backoff 2 s → 5 s → 15 s, then waits for "Tentar de novo"', async () => {
    apiMock.mockRejectedValue(httpError(500))
    type('offline')
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(15000)
    expect(puts()).toHaveLength(4)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(puts()).toHaveLength(4)
    expect(editor.saveState.value).toBe('error')

    apiMock.mockResolvedValue({ data: {} })
    editor.retrySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(puts()).toHaveLength(5)
    expect(editor.saveState.value).toBe('saved')
  })

  it('a failed title save is merged into the next content save', async () => {
    apiMock.mockRejectedValueOnce(httpError(500)).mockResolvedValue({ data: {} })
    editor.noteTitle.value = 'Título novo'
    editor.saveTitle()
    await vi.advanceTimersByTimeAsync(0)
    expect(editor.saveState.value).toBe('error')

    type('corpo novo')
    await vi.advanceTimersByTimeAsync(1000)
    expect(puts()[1]![1].body).toMatchObject({ title: 'Título novo', content: doc('corpo novo') })
    expect(editor.saveState.value).toBe('saved')
  })

  it('failures are kept per note: a failed note B never drops the unsaved text of note A', async () => {
    const noteB = { ...note, id: 'n2', title: 'Outra', content: doc('b') } as Note
    useNoteStore().notes = [note, noteB]
    apiMock.mockRejectedValue(httpError(500))
    type('texto de A')
    await vi.advanceTimersByTimeAsync(1000)
    editor.selectNote(noteB)
    editor.noteContent.value = doc('texto de B')
    editor.debouncedSave()
    await vi.advanceTimersByTimeAsync(1000)
    expect(editor.saveState.value).toBe('error')

    // Reopening A shows its unsaved text, not the stale list copy
    editor.selectNote(note)
    expect(editor.noteContent.value).toEqual(doc('texto de A'))

    apiMock.mockReset()
    apiMock.mockResolvedValue({ data: {} })
    editor.retrySaveNow()
    await vi.advanceTimersByTimeAsync(0)
    const sent = apiMock.mock.calls.filter(([, o]) => o?.method === 'PUT').map(([url, o]) => `${url} ${JSON.stringify(o.body)}`)
    expect(sent.some(c => c.startsWith('/notes/n1') && c.includes('texto de A'))).toBe(true)
    expect(sent.some(c => c.startsWith('/notes/n2') && c.includes('texto de B'))).toBe(true)
    expect(editor.saveState.value).toBe('saved')
  })

  it('404 (note deleted elsewhere) drops the pending write instead of retrying forever', async () => {
    apiMock.mockRejectedValue(httpError(404))
    type('nota apagada')
    await vi.advanceTimersByTimeAsync(1000)
    expect(editor.saveState.value).toBe('saved')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(puts()).toHaveLength(1)
  })

  it('401 → "error" without automatic retry (the session is gone)', async () => {
    apiMock.mockRejectedValue(httpError(401))
    type('sessão expirada')
    await vi.advanceTimersByTimeAsync(1000)
    expect(editor.saveState.value).toBe('error')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(puts()).toHaveLength(1)
  })
})

// In-memory Storage: Node 25 ships its own (inert) localStorage global, so the test owns one
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

describe('useNoteEditor local draft', () => {
  const KEY = 'baigi:draft:u1:n1'
  let scope: EffectScope
  let editor: ReturnType<typeof useNoteEditor>

  function open(n: Note = note) {
    scope = effectScope()
    editor = scope.run(() => useNoteEditor(ref('t1')))!
    editor.selectNote(n)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
    vi.stubGlobal('localStorage', memoryStorage())
    useNoteStore().$reset()
    useNoteStore().notes = [note]
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'ana@baigi.com.br', email_verified: true, plan: 'free', default_learning_mode: 'general', onboarding_completed: true }
  })

  afterEach(() => {
    scope?.stop()
    useAuthStore().user = null
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('keeps the unsaved text locally (debounced) and drops it once the server has it', async () => {
    // Only the first PUT fails (opening the note also posts /opened)
    let failed = false
    apiMock.mockImplementation((_url: string, opts?: { method?: string }) => {
      if (opts?.method === 'PUT' && !failed) {
        failed = true
        return Promise.reject(httpError(500))
      }
      return Promise.resolve({ data: {} })
    })
    open()
    editor.noteContent.value = doc('não perder')
    editor.debouncedSave()
    expect(localStorage.getItem(KEY)).toBeNull()
    await vi.advanceTimersByTimeAsync(300)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ title: 'Nota', content: doc('não perder'), base: note.updated_at })

    await vi.advanceTimersByTimeAsync(700) // PUT fails: the draft stays
    expect(editor.saveState.value).toBe('error')
    expect(localStorage.getItem(KEY)).not.toBeNull()

    await vi.advanceTimersByTimeAsync(2000) // retry succeeds
    expect(editor.saveState.value).toBe('saved')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('nota na lixeira (forgetNote): nada mais é salvo e o rascunho fica para o "Desfazer"', async () => {
    apiMock.mockResolvedValue({ data: {} })
    open()
    editor.noteContent.value = doc('não perder')
    editor.debouncedSave()
    await vi.advanceTimersByTimeAsync(300)
    expect(localStorage.getItem(KEY)).not.toBeNull()
    editor.forgetNote('n1')
    apiMock.mockClear()
    await vi.advanceTimersByTimeAsync(5000)
    expect(apiMock.mock.calls.filter(([url, o]) => url === '/notes/n1' && o?.method === 'PUT')).toHaveLength(0)
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })

  it('opening a note tells the API it was opened (Continuar material on Hoje), once per open', async () => {
    apiMock.mockResolvedValue({ data: {} })
    open()
    await vi.advanceTimersByTimeAsync(0)
    const opened = apiMock.mock.calls.filter(([url, o]) => url === '/notes/n1/opened' && o?.method === 'POST')
    expect(opened).toHaveLength(1)
  })

  it('opening a note with a newer draft offers it; Restaurar fills the editor and saves', async () => {
    apiMock.mockResolvedValue({ data: {} })
    localStorage.setItem(KEY, JSON.stringify({ content: doc('rascunho local'), title: 'Nota', savedAt: Date.parse(note.updated_at) + 60_000 }))
    open()
    expect(editor.pendingDraft.value?.savedAt).toBe(Date.parse(note.updated_at) + 60_000)
    expect(editor.noteContent.value).toEqual(note.content) // never applied silently

    editor.restoreDraft()
    expect(editor.noteContent.value).toEqual(doc('rascunho local'))
    await vi.advanceTimersByTimeAsync(0)
    expect(puts()[0]![1].body).toMatchObject({ content: doc('rascunho local') })
    expect(editor.pendingDraft.value).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('a draft based on the current server version is offered even with the device clock behind', () => {
    localStorage.setItem(KEY, JSON.stringify({ content: doc('rascunho'), title: 'Nota', base: note.updated_at, savedAt: Date.parse(note.updated_at) - 10 * 60_000 }))
    open()
    expect(editor.pendingDraft.value?.content).toEqual(doc('rascunho'))
  })

  it('Descartar removes the draft; older or identical drafts are not offered', () => {
    localStorage.setItem(KEY, JSON.stringify({ content: doc('x'), title: 'Nota', savedAt: Date.parse(note.updated_at) + 1 }))
    open()
    editor.discardDraft()
    expect(localStorage.getItem(KEY)).toBeNull()
    scope.stop()

    localStorage.setItem(KEY, JSON.stringify({ content: doc('antigo'), title: 'Nota', savedAt: Date.parse(note.updated_at) - 1 }))
    open()
    expect(editor.pendingDraft.value).toBeNull()
    scope.stop()

    localStorage.setItem(KEY, JSON.stringify({ content: note.content, title: note.title, savedAt: Date.parse(note.updated_at) + 1 }))
    open()
    expect(editor.pendingDraft.value).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('drafts expire after 7 days', () => {
    localStorage.setItem('baigi:draft:u1:velho', JSON.stringify({ content: null, title: 'x', savedAt: Date.now() - 8 * 24 * 3600_000 }))
    localStorage.setItem('baigi:draft:u1:novo', JSON.stringify({ content: null, title: 'x', savedAt: Date.now() }))
    open()
    expect(localStorage.getItem('baigi:draft:u1:velho')).toBeNull()
    expect(localStorage.getItem('baigi:draft:u1:novo')).not.toBeNull()
  })
})

describe('useNoteEditor com a lista sem content (prd-performance-caderno)', () => {
  let scope: EffectScope
  let editor: ReturnType<typeof useNoteEditor>
  const summary = (id: string, title = 'Nota') => ({ id, topic_id: 't1', title, word_count: 3, plain_preview: null, flashcards_count: 0, updated_at: '2026-11-01T10:00:00Z' }) as unknown as NoteSummary

  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
    useNoteStore().$reset()
    useNoteStore().notes = [summary('n1'), summary('n2', 'Outra')]
    scope = effectScope()
    editor = scope.run(() => useNoteEditor(ref('t1')))!
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  it('abrir um item da lista busca GET /notes/{id}; o editor espera o content', async () => {
    let answer!: (v: unknown) => void
    apiMock.mockReturnValueOnce(new Promise(r => { answer = r }))
    const opening = editor.openNoteEditor(useNoteStore().notes[0]!)
    expect(apiMock).toHaveBeenCalledWith('/notes/n1')
    expect(editor.noteLoading.value).toBe(true)
    expect(editor.editingNote.value?.id).toBe('n1')

    answer({ data: { ...summary('n1'), word_count: 1, content: doc('do servidor') } })
    await opening
    expect(editor.noteLoading.value).toBe(false)
    expect(editor.noteContent.value).toEqual(doc('do servidor'))
    expect(editor.editingNote.value).toMatchObject({ id: 'n1', content: doc('do servidor') })
    // The list keeps only the summary (fresh metadata, no content)
    expect(useNoteStore().notes[0]).toMatchObject({ id: 'n1', word_count: 1 })
    expect(useNoteStore().notes[0]).not.toHaveProperty('content')
  })

  it('uma resposta atrasada não preenche o editor de outra nota', async () => {
    let first!: (v: unknown) => void
    apiMock.mockReturnValueOnce(new Promise(r => { first = r }))
      .mockResolvedValueOnce({ data: { ...summary('n2', 'Outra'), content: doc('nota B') } })
    void editor.openNoteEditor(useNoteStore().notes[0]!)
    editor.closeEditor()
    await editor.openNoteEditor(useNoteStore().notes[1]!)
    first({ data: { ...summary('n1'), content: doc('nota A') } })
    await vi.advanceTimersByTimeAsync(0)
    expect(editor.editingNote.value?.id).toBe('n2')
    expect(editor.noteContent.value).toEqual(doc('nota B'))
  })

  it('falha ao abrir: fecha o editor com aviso, sem editor vazio', async () => {
    apiMock.mockRejectedValueOnce(httpError(500))
    await editor.openNoteEditor(useNoteStore().notes[0]!)
    expect(editor.editingNote.value).toBeNull()
    expect(editor.noteLoading.value).toBe(false)
  })

  it('o documento é lido uma vez por pausa, não por tecla; acima de ~100 KB a pausa é de 2,5 s', async () => {
    apiMock.mockResolvedValueOnce({ data: { ...summary('n1'), content: doc('a') } })
    await editor.openNoteEditor(useNoteStore().notes[0]!)
    apiMock.mockResolvedValue({ data: { id: 'n1', title: 'Nota', word_count: 9, updated_at: '2026-11-01T10:05:00Z' } })
    const read = vi.fn(() => doc('texto grande'))
    for (let i = 0; i < 50; i++) editor.debouncedSave(read, 80_000)
    expect(read).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(puts()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1500)
    expect(read).toHaveBeenCalledTimes(1)
    expect(puts()).toHaveLength(1)
    expect(puts()[0]![1].body).toEqual({ content: doc('texto grande') })
    // The light PUT answer (no content) goes into the list item
    expect(useNoteStore().notes[0]).toMatchObject({ word_count: 9, updated_at: '2026-11-01T10:05:00Z' })
    expect(editor.saveState.value).toBe('saved')
  })
})
