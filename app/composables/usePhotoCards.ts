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

  /** Photo of a page → suggested cards (POST /flashcards/from-image, polled). Also "+ Adicionar → Foto". */
  const reading = ref(false)
  async function processImage(file: File) {
    if (!topicId.value || reading.value) return
    reading.value = true
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('topic_id', topicId.value)
      form.append('count', '5')
      const res = await $api<{ data: { id: string } }>('/flashcards/from-image', { method: 'POST', body: form })
      const data = await pollUntil(async (signal) => {
        const status = await $api<{ data: { status: string; cards?: { front: string; back: string }[] } }>(`/flashcards/from-image/${res.data.id}/status`, { signal })
        return status.data
      }, { interval: 2000, immediate: false, timeout: 60_000, until: d => d.status === 'done' || d.status === 'failed' })
      if (data.status === 'done' && data.cards?.length) fromOcr(data.cards)
      else toast.show('Não foi possível criar cards desta imagem.', 'error')
    } catch (e) {
      if (e instanceof PollTimeoutError) toast.show('A imagem demorou demais. Tente de novo.', 'error')
      else if (getErrorStatus(e) !== 402) reportApiError(e, { error: extractApiMessage(e, 'Não foi possível ler a imagem.') })
    } finally {
      reading.value = false
    }
  }

  return { cards, reading, fromOcr, accept, acceptAll, discard, saveLocal, processImage }
}
