import type { Paginated, TopicDetails } from '~/types'

const PER_PAGE = 50
const SEARCH_DEBOUNCE_MS = 300

/**
 * Composable para gestão de cards de um tópico.
 * Gerencia refs de cards, computeds de estado (due, new, progress) e delete.
 *
 * Dois modos para a lista (RF-09): `client` quando /details trouxe todos os cards
 * (busca e "mostrar mais" locais); `server` quando veio truncado (> 200 cards):
 * a lista pagina e busca em GET /topics/{topic}/flashcards.
 */
export function useTopicCards() {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const cards = ref<any[]>([])
  const showDeleteModal = ref(false)
  const deleteId = ref<string | null>(null)

  const mode = ref<'client' | 'server'>('client')
  const topicId = ref<string | null>(null)
  const totals = ref<{ total: number, due: number, new: number } | null>(null)
  const serverCards = ref<any[]>([])
  const page = ref(1)
  const lastPage = ref(1)
  const serverQuery = ref('')
  const loadingPage = ref(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  /** Cards shown by the list (HubCardsTab) */
  const listCards = computed(() => (mode.value === 'server' ? serverCards.value : cards.value))
  const hasMorePages = computed(() => mode.value === 'server' && page.value < lastPage.value)
  const totalCards = computed(() => totals.value?.total ?? cards.value.length)

  const memorizeProgress = computed(() => {
    if (!cards.value.length) return 0
    const now = new Date()
    const upToDate = cards.value.filter(c => c.state === 'review' && c.due && new Date(c.due) > now).length
    return Math.round((upToDate / cards.value.length) * 100)
  })

  // Truncated details: the partial list would undercount, use the server totals
  const dueCardsCount = computed(() => {
    if (totals.value) return totals.value.due
    return cards.value.filter(c => c.due && new Date(c.due) <= new Date()).length
  })

  const newCardsCount = computed(() => {
    if (totals.value) return totals.value.new
    return cards.value.filter(c => c.state === 'new').length
  })

  const pendingCount = computed(() => dueCardsCount.value + newCardsCount.value)

  function setCards(data: any[], details?: Pick<TopicDetails, 'id' | 'flashcards_truncated' | 'flashcards_count' | 'due_count' | 'new_count'>) {
    cards.value = data
    clearSearchTimer()
    requestId++
    topicId.value = details?.id ?? null
    mode.value = details?.flashcards_truncated ? 'server' : 'client'
    totals.value = details?.flashcards_truncated
      ? { total: details.flashcards_count, due: details.due_count, new: details.new_count }
      : null
    serverQuery.value = ''
    // /details already sent the first pages (ordered by due, like the endpoint)
    serverCards.value = mode.value === 'server' ? data : []
    page.value = Math.max(1, Math.floor(data.length / PER_PAGE))
    lastPage.value = mode.value === 'server' ? Math.ceil(details!.flashcards_count / PER_PAGE) : 1
  }

  async function fetchPage(nextPage: number, q = serverQuery.value) {
    if (!topicId.value) return
    const id = ++requestId
    loadingPage.value = true
    try {
      const query: Record<string, string | number> = { page: nextPage, per_page: PER_PAGE }
      if (q) query.q = q
      const res = await $api<Paginated<any>>(`/topics/${topicId.value}/flashcards`, { query })
      if (id !== requestId) return // a newer search/page superseded this one
      if (nextPage === 1) {
        serverCards.value = res.data
      } else {
        const known = new Set(serverCards.value.map(c => c.id))
        serverCards.value = [...serverCards.value, ...res.data.filter(c => !known.has(c.id))]
      }
      page.value = res.meta.current_page
      lastPage.value = res.meta.last_page
      serverQuery.value = q
    } catch {
      if (id === requestId) toast.show('Erro ao carregar cards.', 'error')
    } finally {
      if (id === requestId) loadingPage.value = false
    }
  }

  function loadNextPage() {
    if (hasMorePages.value && !loadingPage.value) fetchPage(page.value + 1)
  }

  /** Server mode: debounced search on front and back (plain text, server side). */
  function searchCards(q: string) {
    if (mode.value !== 'server') return
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

  function cardsFromNote(noteId: string): number {
    return cards.value.filter(c => c.source_note_id === noteId).length
  }

  async function deleteCard(cardId: string) {
    try {
      await $api(`/flashcards/${cardId}`, { method: 'DELETE' })
      cards.value = cards.value.filter(c => c.id !== cardId)
      serverCards.value = serverCards.value.filter(c => c.id !== cardId)
      if (totals.value) totals.value = { ...totals.value, total: totals.value.total - 1 }
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
    topicCards: cards,
    showDeleteCard: showDeleteModal,
    deleteCardId: deleteId,
    memorizeProgress,
    dueCardsCount,
    newCardsCount,
    pendingCount,
    setCards,
    listMode: mode,
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
