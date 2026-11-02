import type { Ref } from 'vue'

interface PhotoCard {
  front: string
  back: string
  frontAudioBlob?: Blob | null
  backAudioBlob?: Blob | null
}

/**
 * Cards the AI suggested from a photo (OCR), waiting on the card library to be accepted, edited or
 * discarded (prd-4b-caderno-v3 §3.3: the photo part of the old `useAiGenerate`; its 2nd workshop left).
 * Leaving the page (or the tab) keeps them: they are accepted then, never lost.
 */
export function usePhotoCards(topicId: Ref<string | null>, onAccepted: () => Promise<void> | void) {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const cards = ref<PhotoCard[]>([])
  // Caderno the cards belong to (the API resolves the deck from it; AcceptCardsRequest requires topic_id)
  const forTopicId = ref<string | null>(null)

  function acceptOnLeave() {
    if (cards.value.length && forTopicId.value) {
      $api('/ai/accept-cards', { method: 'POST', body: { topic_id: forTopicId.value, cards: cards.value } })
        .catch((e: unknown) => reportApiError(e, { silent: true }))
      cards.value = []
    }
  }
  onBeforeRouteLeave(() => { acceptOnLeave() })
  onMounted(() => { window.addEventListener('beforeunload', acceptOnLeave) })
  onUnmounted(() => { window.removeEventListener('beforeunload', acceptOnLeave) })

  function fromOcr(list: { front: string; back: string }[]) {
    cards.value = list.map(c => ({ front: c.front, back: c.back }))
    forTopicId.value = topicId.value
    toast.show(`${list.length} cards gerados da imagem!`, 'success')
  }

  async function accept(index: number) {
    const card = cards.value[index]
    if (!card || !forTopicId.value) return
    try {
      await $api('/ai/accept-cards', { method: 'POST', body: { topic_id: forTopicId.value, cards: [card] } })
      cards.value.splice(index, 1)
      toast.show('Card aceito!', 'success')
      await onAccepted()
    } catch {
      toast.show('Erro ao aceitar card.', 'error')
    }
  }

  async function acceptAll() {
    if (!cards.value.length || !forTopicId.value) return
    try {
      await $api('/ai/accept-cards', { method: 'POST', body: { topic_id: forTopicId.value, cards: cards.value } })
      const count = cards.value.length
      cards.value = []
      toast.show(`${count} cards aceitos!`, 'success')
      await onAccepted()
    } catch {
      toast.show('Erro ao aceitar cards.', 'error')
    }
  }

  function discard(index: number) {
    cards.value.splice(index, 1)
  }

  function saveLocal(index: number, card: PhotoCard) {
    cards.value[index] = { ...cards.value[index], ...card }
  }

  return { cards, fromOcr, accept, acceptAll, discard, saveLocal }
}
