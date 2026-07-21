import type { Ref, ComputedRef } from 'vue'

/**
 * Composable para gestão de cards de um tópico.
 * Gerencia refs de cards, computeds de estado (due, new, progress) e delete.
 */
export function useTopicCards() {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const cards = ref<any[]>([])
  const showDeleteModal = ref(false)
  const deleteId = ref<string | null>(null)

  const memorizeProgress = computed(() => {
    if (!cards.value.length) return 0
    const mastered = cards.value.filter(c => c.state === 'review').length
    return Math.round((mastered / cards.value.length) * 100)
  })

  const dueCardsCount = computed(() => {
    return cards.value.filter(c => c.due && new Date(c.due) <= new Date()).length
  })

  const newCardsCount = computed(() => {
    return cards.value.filter(c => c.state === 'new').length
  })

  const pendingCount = computed(() => dueCardsCount.value + newCardsCount.value)

  function setCards(data: any[]) {
    cards.value = data
  }

  function cardsFromNote(noteId: string): number {
    return cards.value.filter(c => c.source_note_id === noteId).length
  }

  async function deleteCard(cardId: string) {
    try {
      await $api(`/flashcards/${cardId}`, { method: 'DELETE' })
      cards.value = cards.value.filter(c => c.id !== cardId)
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
    cardsFromNote,
    confirmDeleteCard: confirmDelete,
    handleDeleteCard: handleDelete,
  }
}
