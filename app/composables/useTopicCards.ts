import type { Paginated, TopicDetails } from '~/types'

const PER_PAGE = 50
const SEARCH_DEBOUNCE_MS = 300

/**
 * Composable para gestão de cards de um tópico.
 *
 * Os números do caderno (total, progresso, pendentes, "Revisar N") vêm só dos agregados de
 * GET /topics/{id}/details, que não traz mais a lista de cards (prd-performance-caderno RF-F6).
 * A lista da aba Cards pagina e busca em GET /topics/{topic}/flashcards e só é pedida quando
 * a aba abre (`ensureList`). Com `filterByNote`, a lista mostra só os cards que vieram de uma nota
 * ou PDF (`?source_note_id=`, prd-caderno-f1-pontes RF-F4); os números do caderno não mudam.
 */
export function useTopicCards() {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const summary = shallowRef<TopicDetails | null>(null)
  const showDeleteModal = ref(false)
  const deleteId = ref<string | null>(null)

  const topicId = ref<string | null>(null)
  const listCards = ref<any[]>([])
  const listLoaded = ref(false)
  const page = ref(1)
  const lastPage = ref(1)
  const serverQuery = ref('')
  /** Note (or PDF note) whose cards the list shows; null = the whole caderno */
  const sourceNoteId = ref<string | null>(null)
  /** Cards of that note (meta.total of the filtered list) */
  const filteredTotal = ref<number | null>(null)
  const loadingPage = ref(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  const hasMorePages = computed(() => page.value < lastPage.value)
  const totalCards = computed(() => summary.value?.flashcards_count ?? 0)
  // "Em dia" (review with a future due) over all the cards of the topic, computed by the API
  const memorizeProgress = computed(() => Math.round((summary.value?.progress ?? 0) * 100))
  const dueCardsCount = computed(() => summary.value?.due_count ?? 0)
  const newCardsCount = computed(() => summary.value?.new_count ?? 0)
  const weakCardsCount = computed(() => summary.value?.weak_count ?? 0)
  /** Size of the session "Revisar" opens (same rule and limits as GET /review/session) */
  const pendingCount = computed(() => summary.value?.session_count ?? 0)
  /** What the subtree still needs for a quiz / a podcast, said before the action (F1 RF-F5) */
  const quizGate = computed(() => summary.value?.can_quiz ?? null)
  const podcastGate = computed(() => summary.value?.can_podcast ?? null)

  /** New /details of a topic: the numbers change now; the list reloads when the Cards tab needs it. */
  function setSummary(details: TopicDetails | null) {
    clearSearchTimer()
    requestId++
    summary.value = details
    topicId.value = details?.id ?? null
    listCards.value = []
    listLoaded.value = false
    loadingPage.value = false
    serverQuery.value = ''
    sourceNoteId.value = null
    filteredTotal.value = null
    page.value = 1
    lastPage.value = 1
  }

  async function fetchPage(nextPage: number, q = serverQuery.value) {
    if (!topicId.value) return
    const id = ++requestId
    loadingPage.value = true
    try {
      const query: Record<string, string | number> = { page: nextPage, per_page: PER_PAGE }
      if (q) query.q = q
      if (sourceNoteId.value) query.source_note_id = sourceNoteId.value
      const res = await $api<Paginated<any>>(`/topics/${topicId.value}/flashcards`, { query })
      if (id !== requestId) return // a newer search/page superseded this one
      if (nextPage === 1) {
        listCards.value = res.data
      } else {
        const known = new Set(listCards.value.map(c => c.id))
        listCards.value = [...listCards.value, ...res.data.filter(c => !known.has(c.id))]
      }
      page.value = res.meta.current_page
      lastPage.value = res.meta.last_page
      filteredTotal.value = sourceNoteId.value ? (res.meta.total ?? res.data.length) : null
      serverQuery.value = q
      listLoaded.value = true
    } catch {
      if (id === requestId) toast.show('Erro ao carregar cards.', 'error')
    } finally {
      if (id === requestId) loadingPage.value = false
    }
  }

  /** First page of the list, once per /details (the Cards tab opened); none to ask for an empty topic. */
  async function ensureList() {
    if (listLoaded.value || loadingPage.value || !topicId.value) return
    if (!summary.value?.flashcards_count && !sourceNoteId.value) {
      listLoaded.value = true
      return
    }
    await fetchPage(1, '')
  }

  /** "Ver e editar cards" of a note or PDF: only the cards that came from it; null shows all again. */
  async function filterByNote(noteId: string | null) {
    clearSearchTimer()
    if (sourceNoteId.value === noteId && listLoaded.value) return
    sourceNoteId.value = noteId
    filteredTotal.value = null
    listCards.value = []
    listLoaded.value = false
    if (!topicId.value) return
    await fetchPage(1, '')
  }

  function loadNextPage() {
    if (hasMorePages.value && !loadingPage.value) fetchPage(page.value + 1)
  }

  /** Debounced search on front and back (plain text, server side). */
  function searchCards(q: string) {
    clearSearchTimer()
    searchTimer = setTimeout(() => fetchPage(1, q.trim()), SEARCH_DEBOUNCE_MS)
  }

  function clearSearchTimer() {
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  }

  if (getCurrentScope()) onScopeDispose(clearSearchTimer)

  /** Fallback of note.flashcards_count (the notes list counts them): cards of the note already listed. */
  function cardsFromNote(noteId: string): number {
    return listCards.value.filter(c => c.source_note_id === noteId).length
  }

  async function deleteCard(cardId: string) {
    try {
      await $api(`/flashcards/${cardId}`, { method: 'DELETE' })
      listCards.value = listCards.value.filter(c => c.id !== cardId)
      if (summary.value) summary.value = { ...summary.value, flashcards_count: Math.max(0, summary.value.flashcards_count - 1) }
      if (filteredTotal.value !== null) filteredTotal.value = Math.max(0, filteredTotal.value - 1)
      toast.show('Card excluído.', 'success')
    } catch {
      toast.show('Erro ao excluir card.', 'error')
    }
  }

  function confirmDelete(id: string) {
    deleteId.value = id
    showDeleteModal.value = true
  }

  async function handleDelete() {
    if (!deleteId.value) return
    await deleteCard(deleteId.value)
    deleteId.value = null
    showDeleteModal.value = false
  }

  return {
    showDeleteCard: showDeleteModal,
    deleteCardId: deleteId,
    memorizeProgress,
    dueCardsCount,
    newCardsCount,
    weakCardsCount,
    pendingCount,
    quizGate,
    podcastGate,
    setSummary,
    ensureList,
    sourceNoteId,
    filteredTotal,
    filterByNote,
    listCards,
    hasMorePages,
    loadingPage,
    totalCards,
    loadNextPage,
    searchCards,
    cardsFromNote,
    confirmDeleteCard: confirmDelete,
    handleDeleteCard: handleDelete,
  }
}
