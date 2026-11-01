import type { Note } from '~/types'

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
  // Last failed write: kept (merged into the next save of that note) until one succeeds
  let failed: { noteId: string; data: NoteSaveData } | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryIndex = 0
  let saveSeq = 0
  const latestSeq = new Map<string, number>()
  let disposed = false

  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
  }

  async function persist(noteId: string, data: NoteSaveData) {
    if (failed?.noteId === noteId) {
      data = { ...failed.data, ...data }
      clearRetry()
    }
    const seq = ++saveSeq
    latestSeq.set(noteId, seq)
    saveState.value = 'saving'
    try {
      await noteStore.update(noteId, data)
      // An older request of this note settling late never overrides a newer one
      if (latestSeq.get(noteId) !== seq) return
      if (failed?.noteId === noteId) failed = null
      retryIndex = 0
      saveState.value = failed ? 'error' : saveTimeout ? 'saving' : 'saved'
    } catch (e) {
      if (latestSeq.get(noteId) !== seq) return
      failed = { noteId, data }
      saveState.value = 'error'
      // 401: the api plugin is already sending the user to /entrar
      if (disposed || getErrorStatus(e) === 401 || retryIndex >= RETRY_DELAYS.length) return
      retryTimer = setTimeout(() => {
        retryIndex++
        retrySave()
      }, RETRY_DELAYS[retryIndex])
    }
  }

  /** Resends the failed write (with any newer edit of the same note). */
  function retrySave() {
    clearRetry()
    if (saveTimeout) return flushPendingSave()
    if (failed) void persist(failed.noteId, failed.data)
  }

  /** "Tentar de novo": restarts the automatic backoff too. */
  function retrySaveNow() {
    retryIndex = 0
    retrySave()
  }

  function flushPendingSave() {
    if (saveTimeout && pendingSaveNoteId && pendingSaveContent) {
      clearTimeout(saveTimeout)
      saveTimeout = null
      const noteId = pendingSaveNoteId
      const content = pendingSaveContent
      pendingSaveNoteId = null
      pendingSaveContent = null
      void persist(noteId, { content })
    }
  }

  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    pendingSaveNoteId = noteStore.current?.id ?? null
    pendingSaveContent = noteContent.value ? JSON.parse(JSON.stringify(noteContent.value)) : null
    if (saveState.value !== 'error') saveState.value = 'saving'
    saveTimeout = setTimeout(() => {
      saveTimeout = null
      const noteId = pendingSaveNoteId
      const content = pendingSaveContent
      pendingSaveNoteId = null
      pendingSaveContent = null
      if (noteId && content) void persist(noteId, { content })
    }, 1000)
  }

  function saveTitle() {
    if (noteStore.current && noteTitle.value !== noteStore.current.title) {
      void persist(noteStore.current.id, { title: noteTitle.value })
    }
  }

  onScopeDispose(() => {
    disposed = true
    clearRetry()
  })

  function selectNote(note: Note) {
    flushPendingSave()
    noteStore.current = note
    noteTitle.value = note.title
    noteContent.value = note.content
  }

  function openNoteEditor(note: Note) {
    selectNote(note)
    editingNote.value = note
  }

  function closeEditor() {
    editingNote.value = null
    noteStore.current = null
  }

  async function createNote() {
    if (!topicId.value) return
    const note = await noteStore.create(topicId.value, { title: 'Novo material' })
    openNoteEditor(note)
    await topicStore.fetchTree()
  }

  async function deleteNote() {
    if (!noteStore.current) return
    await noteStore.remove(noteStore.current.id)
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
