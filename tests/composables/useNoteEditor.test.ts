import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, ref, type EffectScope } from 'vue'
import { useNoteEditor } from '~/composables/useNoteEditor'
import { useNoteStore } from '~/stores/note'
import type { Note } from '~/types'

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

  it('401 → "error" without automatic retry (the session is gone)', async () => {
    apiMock.mockRejectedValue(httpError(401))
    type('sessão expirada')
    await vi.advanceTimersByTimeAsync(1000)
    expect(editor.saveState.value).toBe('error')
    await vi.advanceTimersByTimeAsync(30_000)
    expect(puts()).toHaveLength(1)
  })
})
