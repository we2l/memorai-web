import type { Note } from '~/types'
import type { NoteDraft } from '~/composables/useNoteDraft'

/** Autosave indicator (RF-F8): never "saved" while the server lacks the text. */
export type NoteSaveState = 'saved' | 'saving' | 'error'
type NoteSaveData = { title?: string; content?: Record<string, any> | null }

// Automatic retries after a failed save; then only "Tentar de novo" or the next edit
const RETRY_DELAYS = [2000, 5000, 15000]

/**
 * Composable para lógica do editor de notas no hub do caderno.
 * Gerencia seleção, edição, debounced save, CRUD de notas.
 */
export function useNoteEditor(topicId: Ref<string | null>) {
  const noteStore = useNoteStore()
  const topicStore = useTopicStore()
  const toast = useToast()

  const noteTitle = ref('')
  const noteContent = ref<Record<string, any> | null>(null)
  const editingNote = ref<Note | null>(null)
  const selectedText = ref('')
  const showDeleteNote = ref(false)

  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let pendingSaveNoteId: string | null = null
  let pendingSaveContent: Record<string, any> | null = null

  const saveState = ref<NoteSaveState>('saved')
  // Writes the server has not confirmed yet, per note (in flight or failed): merged into the next
  // save of that note and shown when it is reopened, so a stale list copy never wins
  const unsaved = new Map<string, NoteSaveData>()
  const failedIds = new Set<string>()
  const latestSeq = new Map<string, number>()
  let saveSeq = 0
  let inFlight = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryIndex = 0
  let disposed = false

  const draft = useNoteDraft()
  draft.prune()
  // Local draft newer than the server copy, offered when the note opens: never applied silently
  const pendingDraft = ref<(NoteDraft & { noteId: string }) | null>(null)

  function refreshState() {
    saveState.value = failedIds.size ? 'error' : saveTimeout || inFlight ? 'saving' : 'saved'
  }

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
  }

  function scheduleRetry() {
    if (retryTimer || disposed || retryIndex >= RETRY_DELAYS.length) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      retryIndex++
      retrySave()
    }, RETRY_DELAYS[retryIndex])
  }

  /** Server version the edits of a note start from (draft base: no clock comparison needed). */
  const baseOf = (noteId: string) => noteStore.notes.find(n => n.id === noteId)?.updated_at ?? null

  async function persist(noteId: string, data: NoteSaveData) {
    data = { ...unsaved.get(noteId), ...data }
    unsaved.set(noteId, data)
    const seq = ++saveSeq
    latestSeq.set(noteId, seq)
    inFlight++
    refreshState()
    try {
      await noteStore.update(noteId, data)
      // An older request of this note settling late never overrides a newer one
      if (latestSeq.get(noteId) !== seq) return
      unsaved.delete(noteId)
      failedIds.delete(noteId)
      if (!failedIds.size) {
        retryIndex = 0
        clearRetry()
      }
      // The server has the text: drop the draft, unless a newer edit or a restore offer still needs it
      const newerEdit = !!saveTimeout && pendingSaveNoteId === noteId
      if (!newerEdit && pendingDraft.value?.noteId !== noteId) draft.clear(noteId)
    } catch (e) {
      if (latestSeq.get(noteId) !== seq) return
      const status = getErrorStatus(e)
      // Deleted (here or elsewhere): nothing left to save
      if (status === 404) return forget(noteId)
      failedIds.add(noteId)
      // 401: the api plugin is already sending the user to /entrar (the draft brings the text back)
      if (status !== 401) scheduleRetry()
    } finally {
      inFlight--
      refreshState()
    }
  }

  /** Resends every failed write, each with the newest unsaved edit of its note. */
  function retrySave() {
    clearRetry()
    const flushed = flushPendingSave()
    for (const noteId of [...failedIds]) if (noteId !== flushed) void persist(noteId, {})
  }

  /** "Tentar de novo": restarts the automatic backoff too. */
  function retrySaveNow() {
    retryIndex = 0
    retrySave()
  }

  /** Sends the debounced edit now; returns the note it belongs to. */
  function flushPendingSave(): string | null {
    if (!saveTimeout || !pendingSaveNoteId || !pendingSaveContent) return null
    clearTimeout(saveTimeout)
    saveTimeout = null
    const noteId = pendingSaveNoteId
    const content = pendingSaveContent
    pendingSaveNoteId = null
    pendingSaveContent = null
    void persist(noteId, { content })
    return noteId
  }

  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    pendingSaveNoteId = noteStore.current?.id ?? null
    pendingSaveContent = noteContent.value ? JSON.parse(JSON.stringify(noteContent.value)) : null
    // Local copy until the server confirms: survives a 401 redirect or a closed tab (B14)
    if (pendingSaveNoteId && !pendingDraft.value) {
      draft.save(pendingSaveNoteId, { content: pendingSaveContent, title: noteTitle.value, base: baseOf(pendingSaveNoteId) })
    }
    saveTimeout = setTimeout(() => {
      saveTimeout = null
      const noteId = pendingSaveNoteId
      const content = pendingSaveContent
      pendingSaveNoteId = null
      pendingSaveContent = null
      if (noteId && content) void persist(noteId, { content })
      else refreshState()
    }, 1000)
    refreshState()
  }

  function saveTitle() {
    const note = noteStore.current
    if (note && noteTitle.value !== note.title) {
      if (!pendingDraft.value) draft.save(note.id, { content: noteContent.value, title: noteTitle.value, base: baseOf(note.id) })
      void persist(note.id, { title: noteTitle.value })
    }
  }

  /** The note is gone: drop its pending writes, retries and draft. */
  function forget(noteId: string) {
    unsaved.delete(noteId)
    failedIds.delete(noteId)
    latestSeq.delete(noteId)
    if (pendingSaveNoteId === noteId && saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
      pendingSaveNoteId = null
      pendingSaveContent = null
    }
    draft.clear(noteId)
    if (!failedIds.size) clearRetry()
    refreshState()
  }

  /**
   * Draft newer than the server copy and different from it (an identical one is dropped). Newer means
   * the server is still at the version the edits started from or, without that, saved after it.
   */
  function draftNewerThan(note: Note) {
    const d = draft.read(note.id)
    if (!d) return null
    const newer = (d.base != null && d.base === note.updated_at) || d.savedAt > Date.parse(note.updated_at)
    if (!newer) return null
    if (d.title === note.title && JSON.stringify(d.content) === JSON.stringify(note.content)) {
      draft.clear(note.id)
      return null
    }
    return { ...d, noteId: note.id }
  }

  /** "Restaurar": the draft goes back to the editor and to the server. */
  function restoreDraft() {
    const d = pendingDraft.value
    if (!d || noteStore.current?.id !== d.noteId) return
    pendingDraft.value = null
    noteTitle.value = d.title
    noteContent.value = d.content
    void persist(d.noteId, { title: d.title, content: d.content })
  }

  function discardDraft() {
    if (pendingDraft.value) draft.clear(pendingDraft.value.noteId)
    pendingDraft.value = null
  }

  // Closing the tab inside the debounce still leaves the last keystrokes in the draft
  const flushDraft = () => draft.flush()
  if (import.meta.client) {
    window.addEventListener('pagehide', flushDraft)
    document.addEventListener('visibilitychange', flushDraft)
  }

  onScopeDispose(() => {
    disposed = true
    clearRetry()
    draft.flush()
    if (import.meta.client) {
      window.removeEventListener('pagehide', flushDraft)
      document.removeEventListener('visibilitychange', flushDraft)
    }
  })

  function selectNote(note: Note) {
    flushPendingSave()
    noteStore.current = note
    // Edits the server has not confirmed yet (in flight or failed) win over the list copy
    const local = unsaved.get(note.id)
    noteTitle.value = local?.title ?? note.title
    noteContent.value = local && 'content' in local ? local.content ?? null : note.content
    pendingDraft.value = local ? null : draftNewerThan(note)
  }

  function openNoteEditor(note: Note) {
    selectNote(note)
    editingNote.value = note
  }

  function closeEditor() {
    editingNote.value = null
    noteStore.current = null
    pendingDraft.value = null
  }

  async function createNote() {
    if (!topicId.value) return
    const note = await noteStore.create(topicId.value, { title: 'Novo material' })
    openNoteEditor(note)
    await topicStore.fetchTree()
  }

  async function deleteNote() {
    if (!noteStore.current) return
    const id = noteStore.current.id
    await noteStore.remove(id)
    forget(id)
    toast.show('Nota excluída.', 'success')
    await topicStore.fetchTree()
  }

  async function handleDeleteNote() {
    await deleteNote()
    showDeleteNote.value = false
  }

  return {
    noteTitle,
    noteContent,
    editingNote,
    selectedText,
    showDeleteNote,
    saveState,
    retrySaveNow,
    pendingDraft,
    restoreDraft,
    discardDraft,
    flushPendingSave,
    debouncedSave,
    saveTitle,
    selectNote,
    openNoteEditor,
    closeEditor,
    createNote,
    handleDeleteNote,
  }
}
