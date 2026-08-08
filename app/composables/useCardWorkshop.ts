interface GeneratedCard {
  front: string
  back: string
  source_excerpt?: string
  source_reference?: string
}

type WorkshopState = 'idle' | 'loading' | 'workshop' | 'success'

interface UseCardWorkshopOptions {
  topicId: Ref<string | null>
  onReload: () => Promise<void>
}

interface PersistedWorkshop {
  cards: GeneratedCard[]
  sourceNoteId: string | null
  topicId: string
  timestamp: number
}

const STORAGE_KEY = 'baigi-card-workshop'

export function useCardWorkshop({ topicId, onReload }: UseCardWorkshopOptions) {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const state = ref<WorkshopState>('idle')
  const cards = ref<GeneratedCard[]>([])
  const sourceNoteId = ref<string | null>(null)
  const acceptedIndexes = ref<Set<number>>(new Set())
  const savedCount = ref(0)
  const saving = ref(false)

  // --- Session persistence ---

  function persist() {
    if (!import.meta.client || !topicId.value || !cards.value.length) return
    const data: PersistedWorkshop = {
      cards: cards.value,
      sourceNoteId: sourceNoteId.value,
      topicId: topicId.value,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(`${STORAGE_KEY}-${topicId.value}`, JSON.stringify(data))
  }

  function restore() {
    if (!import.meta.client || !topicId.value) return
    const raw = sessionStorage.getItem(`${STORAGE_KEY}-${topicId.value}`)
    if (!raw) return

    try {
      const data: PersistedWorkshop = JSON.parse(raw)
      // Only restore if same topic and recent (< 30 min)
      if (data.topicId === topicId.value && Date.now() - data.timestamp < 30 * 60 * 1000) {
        cards.value = data.cards
        sourceNoteId.value = data.sourceNoteId
        state.value = 'workshop'
      } else {
        clearPersisted()
      }
    } catch {
      clearPersisted()
    }
  }

  function clearPersisted() {
    if (!import.meta.client || !topicId.value) return
    sessionStorage.removeItem(`${STORAGE_KEY}-${topicId.value}`)
  }

  // Restore when topic changes
  watch(topicId, (id) => {
    if (id && state.value === 'idle') {
      restore()
    }
  }, { immediate: true })

  // --- Core logic ---

  async function generate(source: 'notes' | 'pdf', noteId?: string, documentId?: string) {
    if (!topicId.value) return
    if (state.value === 'loading') return

    state.value = 'loading'
    sourceNoteId.value = noteId ?? null
    acceptedIndexes.value = new Set()
    savedCount.value = 0

    try {
      const body: Record<string, any> = {
        source,
        topic_id: topicId.value,
      }
      if (noteId) body.note_id = noteId
      if (documentId) body.document_id = documentId

      const res = await $api<any>('/ai/generate-cards', {
        method: 'POST',
        body,
      })

      const generated = res.data?.cards ?? []
      if (generated.length) {
        cards.value = generated
        state.value = 'workshop'
        persist()
      } else {
        toast.show('Nenhum card gerado. Tente adicionar mais conteúdo.', 'error')
        state.value = 'idle'
      }
    } catch (e: any) {
      state.value = 'idle'
      const msg = e?.data?.message || 'Erro ao gerar cards.'
      toast.show(msg, 'error')
    }
  }

  function editCard(index: number, data: { front: string; back: string }) {
    if (cards.value[index]) {
      cards.value[index] = { ...cards.value[index], ...data }
      persist()
    }
  }

  function removeCard(index: number) {
    cards.value.splice(index, 1)
    // Rebuild accepted indexes (shift down)
    const newAccepted = new Set<number>()
    for (const i of acceptedIndexes.value) {
      if (i < index) newAccepted.add(i)
      else if (i > index) newAccepted.add(i - 1)
    }
    acceptedIndexes.value = newAccepted

    if (cards.value.length === 0) {
      state.value = 'idle'
      clearPersisted()
    } else {
      persist()
    }
  }

  async function acceptCard(index: number) {
    if (!topicId.value || acceptedIndexes.value.has(index)) return

    const card = cards.value[index]
    if (!card) return

    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: {
          topic_id: topicId.value,
          note_id: sourceNoteId.value,
          cards: [{ front: card.front, back: card.back, topic_id: topicId.value }],
        },
      })
      acceptedIndexes.value = new Set([...acceptedIndexes.value, index])
      savedCount.value++

      // If all accepted, show success
      if (acceptedIndexes.value.size === cards.value.length) {
        state.value = 'success'
        clearPersisted()
        await onReload()
      }
    } catch {
      toast.show('Erro ao aceitar card.', 'error')
    }
  }

  async function saveAll() {
    if (!topicId.value || !cards.value.length || saving.value) return
    saving.value = true

    // Only save cards that haven't been individually accepted
    const remaining = cards.value.filter((_, i) => !acceptedIndexes.value.has(i))

    if (remaining.length === 0) {
      cards.value = []
      acceptedIndexes.value = new Set()
      state.value = 'success'
      clearPersisted()
      saving.value = false
      await onReload()
      return
    }

    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: {
          topic_id: topicId.value,
          note_id: sourceNoteId.value,
          cards: remaining.map(c => ({
            front: c.front,
            back: c.back,
            topic_id: topicId.value,
          })),
        },
      })

      savedCount.value += remaining.length
      cards.value = []
      acceptedIndexes.value = new Set()
      state.value = 'success'
      clearPersisted()
      await onReload()
    } catch {
      toast.show('Erro ao salvar cards.', 'error')
    } finally {
      saving.value = false
    }
  }

  function discardAll() {
    cards.value = []
    acceptedIndexes.value = new Set()
    savedCount.value = 0
    state.value = 'idle'
    sourceNoteId.value = null
    clearPersisted()
  }

  function reset() {
    discardAll()
  }

  return {
    state,
    cards,
    sourceNoteId,
    acceptedIndexes,
    savedCount,
    saving,
    generate,
    editCard,
    removeCard,
    acceptCard,
    saveAll,
    discardAll,
    reset,
  }
}
