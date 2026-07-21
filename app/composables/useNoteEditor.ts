import type { Note } from '~/types'

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

  function flushPendingSave() {
    if (saveTimeout && pendingSaveNoteId && pendingSaveContent) {
      clearTimeout(saveTimeout)
      saveTimeout = null
      noteStore.update(pendingSaveNoteId, { content: pendingSaveContent })
      pendingSaveNoteId = null
      pendingSaveContent = null
    }
  }

  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout)
    pendingSaveNoteId = noteStore.current?.id ?? null
    pendingSaveContent = noteContent.value ? JSON.parse(JSON.stringify(noteContent.value)) : null
    saveTimeout = setTimeout(() => {
      if (pendingSaveNoteId && pendingSaveContent) {
        noteStore.update(pendingSaveNoteId, { content: pendingSaveContent })
        pendingSaveNoteId = null
        pendingSaveContent = null
      }
      saveTimeout = null
    }, 1000)
  }

  function saveTitle() {
    if (noteStore.current && noteTitle.value !== noteStore.current.title) {
      noteStore.update(noteStore.current.id, { title: noteTitle.value })
    }
  }

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

  async function handleQuickAdd(text: string) {
    if (!topicId.value) return
    const title = text.substring(0, 50).split('\n')[0] || 'Material'
    const note = await noteStore.create(topicId.value, {
      title,
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
    })
    openNoteEditor(note)
    await topicStore.fetchTree()
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
    flushPendingSave,
    debouncedSave,
    saveTitle,
    selectNote,
    openNoteEditor,
    closeEditor,
    handleQuickAdd,
    createNote,
    handleDeleteNote,
  }
}
