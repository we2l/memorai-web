import type { Note, NoteSummary } from '~/types'
import type { NoteDraft } from '~/composables/useNoteDraft'

/** Autosave indicator (RF-F8): never "saved" while the server lacks the text. */
export type NoteSaveState = 'saved' | 'saving' | 'error'
type NoteContent = Record<string, any> | null
type NoteSaveData = { title?: string; content?: NoteContent }
/** Reads the editor document; called when the draft or the autosave writes, not per keystroke. */
export type NoteContentReader = () => NoteContent

// Automatic retries after a failed save; then only "Tentar de novo" or the next edit
const RETRY_DELAYS = [2000, 5000, 15000]
// Autosave pause; longer above ~100 KB of JSON (≈ 75k ProseMirror positions), where each PUT
// serializes and sends the whole document (prd-performance-caderno RF-F4)
const SAVE_DEBOUNCE_MS = 1000
const BIG_DOC_SAVE_DEBOUNCE_MS = 2500
const BIG_DOC_SIZE = 75_000

/**
 * Composable para lógica do editor de notas no hub do caderno.
 * Gerencia seleção, edição, debounced save, CRUD de notas.
 */
export function useNoteEditor(topicId: Ref<string | null>) {
  const noteStore = useNoteStore()
  const topicStore = useTopicStore()
  const toast = useToast()

  const noteTitle = ref('')
  // Outside deep reactivity: behind a proxy, a 400 KB Tiptap JSON paid per node on every read (RF-F4)
  const noteContent = shallowRef<NoteContent>(null)
  /** Note open in the editor: the list summary until GET /notes/{id} answers, then the full note. */
  const editingNote = shallowRef<NoteSummary | Note | null>(null)
  /** Full note on its way: the editor waits (typing on an empty document would overwrite it). */
  const noteLoading = ref(false)
  const selectedText = ref('')

  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let pendingSaveNoteId: string | null = null
  let pendingRead: NoteContentReader | null = null
  // Bumped by each open/close: a late GET /notes/{id} never fills the editor of another note
  let openSeq = 0

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
  // The material route has no list: the open note (merged with each PUT answer) carries it
  const baseOf = (noteId: string) => noteStore.notes.find(n => n.id === noteId)?.updated_at
    ?? (noteStore.current?.id === noteId ? noteStore.current.updated_at : null)

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
    if (!saveTimeout) return null
    clearTimeout(saveTimeout)
    saveTimeout = null
    return sendPendingSave()
  }

  function sendPendingSave(): string | null {
    const noteId = pendingSaveNoteId
    const read = pendingRead
    pendingSaveNoteId = null
    pendingRead = null
    // The document is serialized here, once per pause (RF-F4)
    const content = read?.() ?? null
    if (!noteId || !content) {
      refreshState()
      return null
    }
    // The editor's own object: NoteEditor sees the same reference and does not reload it
    if (noteStore.current?.id === noteId) noteContent.value = content
    void persist(noteId, { content })
    return noteId
  }

  /**
   * An edit of the open note. `read` returns the editor document (default: `noteContent`) and is
   * only called by the draft and the autosave; `docSize` (ProseMirror positions) picks the pause.
   */
  function debouncedSave(read: NoteContentReader = () => noteContent.value, docSize = 0) {
    if (saveTimeout) clearTimeout(saveTimeout)
    pendingSaveNoteId = noteStore.current?.id ?? null
    pendingRead = read
    // Local copy until the server confirms: survives a 401 redirect or a closed tab (B14)
    if (pendingSaveNoteId && !pendingDraft.value) {
      draft.save(pendingSaveNoteId, { content: read, title: noteTitle.value, base: baseOf(pendingSaveNoteId) })
    }
    saveTimeout = setTimeout(() => {
      saveTimeout = null
      sendPendingSave()
    }, docSize > BIG_DOC_SIZE ? BIG_DOC_SAVE_DEBOUNCE_MS : SAVE_DEBOUNCE_MS)
    refreshState()
  }

  function saveTitle() {
    const note = noteStore.current
    if (note && noteTitle.value !== note.title) {
      // The draft carries the newest body too: the pending edit, else the last one sent
      const content = (pendingSaveNoteId === note.id && pendingRead) || noteContent.value
      if (!pendingDraft.value) draft.save(note.id, { content, title: noteTitle.value, base: baseOf(note.id) })
      void persist(note.id, { title: noteTitle.value })
    }
  }

  /** The note is gone: drop its pending writes, retries and draft. */
  function forget(noteId: string, keepDraft = false) {
    unsaved.delete(noteId)
    failedIds.delete(noteId)
    latestSeq.delete(noteId)
    if (pendingSaveNoteId === noteId && saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
      pendingSaveNoteId = null
      pendingRead = null
    }
    if (!keepDraft) draft.clear(noteId)
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

  /**
   * Selects a note. A list item has no content (RF-F1): GET /notes/{id} loads it first.
   * Resolves with the full note, or null when it could not be opened (or another one was).
   */
  async function selectNote(note: NoteSummary | Note): Promise<Note | null> {
    flushPendingSave()
    draft.flush()
    const seq = ++openSeq
    const { content: _content, ...summary } = note as Note
    noteStore.current = summary
    noteStore.markOpened(note.id)
    // Edits the server has not confirmed yet (in flight or failed) win over the server copy
    const local = unsaved.get(note.id)
    noteTitle.value = local?.title ?? note.title
    pendingDraft.value = null
    let full = 'content' in note ? note : null
    if (!full) {
      noteLoading.value = true
      try {
        full = await noteStore.fetchOne(note.id)
      } catch (e) {
        if (seq !== openSeq) return null
        closeEditor()
        reportApiError(e, { error: 'Não foi possível abrir a nota.' })
        return null
      }
      if (seq !== openSeq) return null
      // Opened by id (the material route has no list item): the title comes with the note
      if (!local?.title) noteTitle.value = full.title
    }
    noteContent.value = local && 'content' in local ? local.content ?? null : full.content
    pendingDraft.value = local ? null : draftNewerThan(full)
    noteLoading.value = false
    return full
  }

  async function openNoteEditor(note: NoteSummary | Note) {
    editingNote.value = note
    const full = await selectNote(note)
    if (full && editingNote.value?.id === full.id) editingNote.value = full
  }

  function closeEditor() {
    openSeq++
    noteLoading.value = false
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

  /**
   * The note went to the trash (CadernoTrashDialog): no more saves for it, and the tree counts again. The local draft
   * of a save that failed stays: "Desfazer" brings the note back and the draft offers the text.
   */
  function forgetNote(id: string) {
    forget(id, true)
    void topicStore.fetchTree()
  }

  return {
    noteTitle,
    noteContent,
    editingNote,
    noteLoading,
    selectedText,
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
    forgetNote,
  }
}
