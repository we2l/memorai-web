import type { Ref } from 'vue'

interface AiGenerateOptions {
  topicId: Ref<string | null>
  activeTab: Ref<string>
  onReload: () => Promise<void>
}

/**
 * Composable para fluxo de geração de cards via IA.
 * Gerencia geração, OCR, accept/discard, auto-accept on leave.
 */
export function useAiGenerate({ topicId, activeTab, onReload }: AiGenerateOptions) {
  const { $api } = useNuxtApp()
  const aiJob = useAiJob()
  const toast = useToast()

  const generatedCards = ref<any[]>([])
  // Caderno the pending cards belong to (the API resolves the deck from it; AcceptCardsRequest requires topic_id)
  const generatingTopicId = ref<string | null>(null)
  const aiGenerating = ref(false)

  // Auto-accept generated cards if user leaves
  function autoAcceptPendingCards() {
    if (generatedCards.value.length && generatingTopicId.value) {
      $api('/ai/accept-cards', {
        method: 'POST',
        body: { topic_id: generatingTopicId.value, cards: generatedCards.value },
      }).catch((e: unknown) => reportApiError(e, { silent: true }))
      generatedCards.value = []
    }
  }

  onBeforeRouteLeave(() => { autoAcceptPendingCards() })
  onMounted(() => { window.addEventListener('beforeunload', autoAcceptPendingCards) })
  onUnmounted(() => { window.removeEventListener('beforeunload', autoAcceptPendingCards) })

  async function handleAiGenerate(source: string, quantity: number, documentIdOrPrompt?: string) {
    if (!topicId.value) return
    const forTopicId = topicId.value

    activeTab.value = 'cards'
    aiGenerating.value = true
    toast.show('Gerando cards com IA...', 'success')
    try {
      // 202 + job polled until done (RF-30)
      const result = await aiJob.run<{ cards: any[] }>('/ai/generate-cards', {
        topic_id: forTopicId,
        source,
        count: quantity,
        document_id: source === 'pdf' ? documentIdOrPrompt : undefined,
        prompt: source === 'free' ? documentIdOrPrompt : undefined,
      })
      const cards = result?.cards ?? []
      if (cards.length) {
        generatedCards.value = cards
        generatingTopicId.value = forTopicId
      } else {
        toast.show('Nenhum card gerado.', 'error')
      }
    } catch (e: any) {
      const msg = e.data?.message || 'Erro ao gerar cards.'
      toast.show(msg, 'error')
    } finally {
      aiGenerating.value = false
    }
  }

  function handleOcrCards(cards: any[]) {
    generatedCards.value = cards.map(c => ({ front: c.front, back: c.back }))
    generatingTopicId.value = topicId.value

    activeTab.value = 'cards'
    toast.show(`${cards.length} cards gerados da imagem!`, 'success')
  }

  async function acceptCard(index: number) {
    const card = generatedCards.value[index]
    if (!card || !generatingTopicId.value) return
    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: { topic_id: generatingTopicId.value, cards: [card] },
      })
      generatedCards.value.splice(index, 1)
      toast.show('Card aceito!', 'success')
      await onReload()
    } catch {
      toast.show('Erro ao aceitar card.', 'error')
    }
  }

  async function acceptAllCards() {
    if (!generatedCards.value.length || !generatingTopicId.value) return
    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: { topic_id: generatingTopicId.value, cards: generatedCards.value },
      })
      const count = generatedCards.value.length
      generatedCards.value = []
      toast.show(`${count} cards aceitos!`, 'success')
      await onReload()
    } catch {
      toast.show('Erro ao aceitar cards.', 'error')
    }
  }

  function generateFromCurrentNote(count: number = 5) {
    if (!topicId.value) {
      toast.show('Selecione um caderno primeiro.', 'error')
      return
    }
    handleAiGenerate('notes', count)
  }

  function discardGenerated(index: number) {
    generatedCards.value.splice(index, 1)
  }

  function onLocalSaveGenerated(index: number, card: { front: string; back: string; frontAudioBlob: Blob | null; backAudioBlob: Blob | null }) {
    generatedCards.value[index] = {
      ...generatedCards.value[index],
      front: card.front,
      back: card.back,
      frontAudioBlob: card.frontAudioBlob,
      backAudioBlob: card.backAudioBlob,
    }
  }

  return {
    generatedCards,
    generatingTopicId,
    aiGenerating,
    handleAiGenerate,
    handleOcrCards,
    acceptCard,
    acceptAllCards,
    generateFromCurrentNote,
    discardGenerated,
    onLocalSaveGenerated,
  }
}
