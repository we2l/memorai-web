import type { Ref } from 'vue'

interface AiGenerateOptions {
  topicId: Ref<string | null>
  topicCards: Ref<any[]>
  activeTab: Ref<string>
  onReload: () => Promise<void>
}

/**
 * Composable para fluxo de geração de cards via IA.
 * Gerencia geração, OCR, accept/discard, auto-accept on leave.
 */
export function useAiGenerate({ topicId, topicCards, activeTab, onReload }: AiGenerateOptions) {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const generatedCards = ref<any[]>([])
  const generatingDeckId = ref<string>('')
  const aiGenerating = ref(false)

  // Auto-accept generated cards if user leaves
  function autoAcceptPendingCards() {
    if (generatedCards.value.length && generatingDeckId.value) {
      $api('/ai/accept-cards', {
        method: 'POST',
        body: {
          deck_id: generatingDeckId.value,
          cards: generatedCards.value.map(c => ({ ...c, topic_id: topicId.value })),
        },
      }).catch(() => {})
      generatedCards.value = []
    }
  }

  onBeforeRouteLeave(() => { autoAcceptPendingCards() })
  onMounted(() => { window.addEventListener('beforeunload', autoAcceptPendingCards) })
  onUnmounted(() => { window.removeEventListener('beforeunload', autoAcceptPendingCards) })

  async function handleAiGenerate(source: string, quantity: number, documentIdOrPrompt?: string) {
    if (!topicId.value) return

    let deckId = topicCards.value[0]?.deck_id
    if (!deckId) {
      const deckStore = useDeckStore()
      if (!deckStore.decks.length) await deckStore.fetchDecks()
      deckId = deckStore.decks[0]?.id
    }
    if (!deckId) {
      toast.show('Crie um deck antes de gerar cards.', 'error')
      return
    }

    activeTab.value = 'cards'
    aiGenerating.value = true
    toast.show('Gerando cards com IA...', 'success')
    try {
      const res = await $api<any>('/ai/generate-cards', {
        method: 'POST',
        body: {
          topic_id: topicId.value,
          deck_id: deckId,
          source,
          count: quantity,
          document_id: source === 'pdf' ? documentIdOrPrompt : undefined,
          prompt: source === 'free' ? documentIdOrPrompt : undefined,
        },
      })
      const cards = res.data?.cards ?? []
      if (cards.length) {
        generatedCards.value = cards
        generatingDeckId.value = deckId
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

  async function handleOcrCards(cards: any[]) {
    generatedCards.value = cards.map(c => ({ front: c.front, back: c.back }))

    // Ensure we have a deck to accept cards into
    let deckId = topicCards.value[0]?.deck_id
    if (!deckId) {
      const deckStore = useDeckStore()
      if (!deckStore.decks.length) await deckStore.fetchDecks()
      deckId = deckStore.decks[0]?.id
    }
    generatingDeckId.value = deckId || null

    activeTab.value = 'cards'
    toast.show(`${cards.length} cards gerados da imagem!`, 'success')
  }

  async function acceptCard(index: number) {
    const card = generatedCards.value[index]
    if (!card || !generatingDeckId.value) return
    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: {
          deck_id: generatingDeckId.value,
          cards: [{ ...card, topic_id: topicId.value }],
        },
      })
      generatedCards.value.splice(index, 1)
      toast.show('Card aceito!', 'success')
      await onReload()
    } catch {
      toast.show('Erro ao aceitar card.', 'error')
    }
  }

  async function acceptAllCards() {
    if (!generatedCards.value.length || !generatingDeckId.value) return
    try {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: {
          deck_id: generatingDeckId.value,
          cards: generatedCards.value.map(c => ({ ...c, topic_id: topicId.value })),
        },
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
    generatingDeckId,
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
