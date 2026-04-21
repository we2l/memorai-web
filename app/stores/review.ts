import { defineStore } from 'pinia'
import type { Flashcard, WeakConnection } from '~/types'

interface SessionCard extends Flashcard {
  next_intervals: { again: string; hard: string; good: string; easy: string }
}

export const useReviewStore = defineStore('review', {
  state: () => ({
    cards: [] as SessionCard[],
    learningQueue: [] as { card: SessionCard; dueAt: number }[],
    currentIndex: 0,
    flipped: false,
    loading: false,
    submitting: false,
    finished: false,
    weakSuggestion: null as WeakConnection[] | null,
    noteSnippet: null as { note_id: string; title: string; snippet: string; topic_id: string } | null,
    lastReviewId: null as string | null,
    showErrorDiary: false,
    _tick: 0,
  }),

  getters: {
    currentCard(state): SessionCard | null {
      const _tick = state._tick // reactive dependency
      const now = Date.now()
      const dueLearn = state.learningQueue.find(q => q.dueAt <= now)
      if (dueLearn) return dueLearn.card
      return state.cards[state.currentIndex] ?? null
    },
    currentIntervals(): { again: string; hard: string; good: string; easy: string } {
      return this.currentCard?.next_intervals ?? { again: '', hard: '', good: '', easy: '' }
    },
    total(state): number {
      return state.cards.length + state.learningQueue.length
    },
    reviewed: (state) => state.currentIndex,
    progress(state): number {
      const t = state.cards.length + state.learningQueue.length
      if (!t) return 0
      return Math.min(100, Math.round((state.currentIndex / t) * 100))
    },
    pendingLearning: (state) => state.learningQueue.length,
  },

  actions: {
    async fetchSession(deckId?: string, topicId?: string, errorsOnly?: boolean, backlog?: boolean) {
      this.loading = true
      this.finished = false
      this.currentIndex = 0
      this.flipped = false
      this.learningQueue = []
      this.weakSuggestion = null
      this.noteSnippet = null
      this.showErrorDiary = false
      try {
        const { $api } = useNuxtApp()
        const params = new URLSearchParams()
        if (deckId) params.set('deck_id', deckId)
        if (topicId) params.set('topic_id', topicId)
        if (errorsOnly) params.set('errors_only', '1')
        if (backlog) params.set('backlog', '1')
        const query = params.toString() ? `?${params}` : ''
        const res = await $api<any>(`/review/session${query}`)
        const allCards = res.data as SessionCard[]
        const now = Date.now()

        // Separate learning/relearning cards with future due into learningQueue
        this.cards = []
        for (const card of allCards) {
          const isLearning = card.state === 'learning' || card.state === 'relearning'
          const dueFuture = card.due && new Date(card.due).getTime() > now
          if (isLearning && dueFuture) {
            this.learningQueue.push({ card, dueAt: new Date(card.due!).getTime() })
          } else {
            this.cards.push(card)
          }
        }

        if (!this.cards.length && !this.learningQueue.length) this.finished = true
      } finally {
        this.loading = false
      }
    },

    flip() {
      this.flipped = true
    },

    async submitReview(rating: 1 | 2 | 3 | 4) {
      const card = this.currentCard
      if (!card || this.submitting) return
      this.submitting = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/review', {
          method: 'POST',
          body: { flashcard_id: card.id, rating },
        })

        // Weak connection suggestion on Again
        this.weakSuggestion = res.data.weak_connections ?? null
        this.noteSnippet = res.data.note_snippet ?? null

        // Show error diary on Again
        this.lastReviewId = res.data.review?.id ?? null
        this.showErrorDiary = rating === 1 && !!this.lastReviewId

        const updatedCard = {
          ...res.data.flashcard,
          next_intervals: res.data.next_intervals,
        } as SessionCard

        // Remove from learning queue if it was there
        const wasFromLearningQueue = this.learningQueue.some(q => q.card.id === card.id)
        this.learningQueue = this.learningQueue.filter(q => q.card.id !== card.id)

        // Advance main queue index only if card came from main queue (not learning)
        if (!wasFromLearningQueue) {
          this.currentIndex++
        }

        const hasMoreMainCards = this.currentIndex < this.cards.length

        if (updatedCard.is_learning) {
          const dueAt = updatedCard.due ? new Date(updatedCard.due).getTime() : Date.now() + 60000
          this.learningQueue.push({ card: updatedCard, dueAt })
        }

        // Learn ahead: if no more main cards, show all learning cards immediately
        if (!hasMoreMainCards) {
          this.learningQueue = this.learningQueue.map(item => ({
            ...item,
            dueAt: Date.now(),
          }))
        }

        this.flipped = false
        this.checkFinished()
      } finally {
        this.submitting = false
      }
    },

    checkFinished() {
      const hasMainCards = this.currentIndex < this.cards.length
      const hasPendingLearning = this.learningQueue.length > 0
      if (!hasMainCards && !hasPendingLearning) {
        this.finished = true
      }
    },
  },
})
