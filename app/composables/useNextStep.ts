import type { Note } from '~/types'

type NextStepType = 'improve' | 'cards' | 'review' | null

interface UseNextStepOptions {
  topicId: Ref<string | null>
  notes: Ref<Note[]>
  flashcardsCount: Ref<number>
  dueCardsCount: Ref<number>
  editingNote: Ref<Note | null>
}

export function useNextStep({ topicId, notes, flashcardsCount, dueCardsCount, editingNote }: UseNextStepOptions) {
  const dismissed = ref(false)
  const visible = ref(false)

  // Cooldown: 7 days (only after explicit dismiss)
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

  function calculateStructuralScore(content: Record<string, any> | null): number {
    if (!content?.content) return 0

    let structural = 0
    let total = 0

    function walkNodes(nodes: any[]) {
      for (const node of nodes) {
        total++
        if (['heading', 'bulletList', 'orderedList', 'callout', 'table', 'blockquote', 'image'].includes(node.type)) {
          structural++
        }
        if (node.content) walkNodes(node.content)
      }
    }

    walkNodes(content.content)
    if (total === 0) return 0
    return structural / total
  }

  function extractWordCount(content: Record<string, any> | null): number {
    if (!content?.content) return 0
    let text = ''
    function walk(nodes: any[]) {
      for (const node of nodes) {
        if (node.text) text += node.text + ' '
        if (node.content) walk(node.content)
      }
    }
    walk(content.content)
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  function isRawNote(content: Record<string, any> | null): boolean {
    if (!content?.content) return false
    const words = extractWordCount(content)
    if (words < 200) return false
    const score = calculateStructuralScore(content)
    return score < 0.15
  }

  const totalWords = computed(() => {
    return notes.value.reduce((sum, note) => sum + extractWordCount(note.content), 0)
  })

  const estimatedConcepts = computed(() => Math.floor(totalWords.value / 45))

  const coverage = computed(() => {
    if (estimatedConcepts.value <= 0) return 1
    return flashcardsCount.value / estimatedConcepts.value
  })

  const step = computed<NextStepType>(() => {
    if (!topicId.value) return null

    // Priority 1: Improve (raw note being edited)
    if (editingNote.value && isRawNote(editingNote.value.content)) {
      return 'improve'
    }

    // Priority 2: Generate cards (low coverage)
    const hasMatureNote = notes.value.some(n => extractWordCount(n.content) >= 200)
    if (hasMatureNote && coverage.value < 0.6) {
      return 'cards'
    }

    // Check for "dirty" notes (updated after cards were generated) — only if coverage is still moderate
    if (hasMatureNote && coverage.value < 1.2) {
      const hasDirtyNote = notes.value.some((n) => {
        if (!n.cards_generated_at) return false // never generated via pipeline = not dirty (legacy data)
        return new Date(n.updated_at) > new Date(n.cards_generated_at)
      })
      if (hasDirtyNote) {
        return 'cards'
      }
    }

    // Priority 3: Review pending
    if (dueCardsCount.value > 0) {
      return 'review'
    }

    return null
  })

  const copyText = computed(() => {
    switch (step.value) {
      case 'improve':
        return 'Detectei uma nota pouco estruturada. Posso organizar em tópicos e destaques.'
      case 'cards':
        return estimatedConcepts.value > 0
          ? `~${estimatedConcepts.value} conceitos prontos pra revisão.`
          : 'Material novo disponível para transformar em flashcards.'
      case 'review':
        return `${dueCardsCount.value} card${dueCardsCount.value !== 1 ? 's' : ''} pronto${dueCardsCount.value !== 1 ? 's' : ''} pra revisar.`
      default:
        return ''
    }
  })

  // Check if dismissed via cooldown
  function isDismissedByCooldown(): boolean {
    if (!import.meta.client || !topicId.value) return false
    const stored = localStorage.getItem(`baigi-nextstep-dismissed-${topicId.value}`)
    return !!(stored && Date.now() - Number(stored) < COOLDOWN_MS)
  }

  const shouldShow = computed(() => {
    if (!step.value) return false
    if (dismissed.value) return false
    if (isDismissedByCooldown()) return false
    return true
  })

  function dismiss() {
    dismissed.value = true
    visible.value = false
    if (import.meta.client && topicId.value) {
      localStorage.setItem(`baigi-nextstep-dismissed-${topicId.value}`, String(Date.now()))
    }
  }

  // Show immediately when shouldShow becomes true (no artificial delay)
  // The banner has its own CSS transition for smooth entrance
  watchEffect(() => {
    visible.value = shouldShow.value
  })

  // Reset dismissed state when topic changes
  watch(topicId, () => {
    dismissed.value = false
  })

  return {
    step,
    copyText,
    estimatedConcepts,
    coverage,
    dismissed,
    visible,
    shouldShow,
    dismiss,
    isRawNote,
    calculateStructuralScore,
    extractWordCount,
  }
}
