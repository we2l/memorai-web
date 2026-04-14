import { defineStore } from 'pinia'
import type { Flashcard, ReviewPayload } from '~/types'

export const useReviewStore = defineStore('review', {
  state: () => ({
    cards: [] as Flashcard[],
    learningQueue: [] as { card: Flashcard; dueAt: number }[],
    currentIndex: 0,
    flipped: false,
    loading: false,
    submitting: false,
    finished: false,
  }),

  getters: {
    currentCard(state): Flashcard | null {
      // Check if any learning card is due
      const now = Date.now()
      const dueLearn = state.learningQueue.find(q => q.dueAt <= now)
      if (dueLearn) return dueLearn.card

      return state.cards[state.currentIndex] ?? null
    },
    total: (state) => state.cards.length + state.learningQueue.length,
    reviewed: (state) => state.currentIndex,
    progress(state): number {
      const total = state.cards.length + state.learningQueue.length
      if (!total) return 0
      return Math.round((state.currentIndex / total) * 100)
    },
    pendingLearning: (state) => state.learningQueue.length,
  },

  actions: {
    async fetchSession(deckId?: string) {
      this.loading = true
      this.finished = false
      this.currentIndex = 0
      this.flipped = false
      this.learningQueue = []
      try {
        const { $api } = useNuxtApp()
        const query = deckId ? `?deck_id=${deckId}` : ''
        const res = await $api<any>(`/review/session${query}`)
        this.cards = res.data
        if (!this.cards.length) this.finished = true
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
          body: { flashcard_id: card.id, rating } as ReviewPayload,
        })

        const updatedCard = res.data.flashcard as Flashcard

        // Remove from learning queue if it was there
        this.learningQueue = this.learningQueue.filter(q => q.card.id !== card.id)

        // If card is still in learning, add to learning queue with timer
        if (updatedCard.is_learning && updatedCard.due) {
          const dueAt = new Date(updatedCard.due).getTime()
          this.learningQueue.push({ card: updatedCard, dueAt })
        }

        // Only advance index if the card was from the main queue
        if (!card.is_learning || !this.cards.some(c => c.id === card.id)) {
          // Card was from learning queue, don't advance
        } else {
          this.currentIndex++
        }

        // Advance if current card was from main queue
        if (this.cards[this.currentIndex - 1]?.id === card.id || (!card.is_learning && this.cards[this.currentIndex]?.id !== card.id)) {
          // Already advanced or was learning card
        }

        this.flipped = false
        this.checkFinished()
      } finally {
        this.submitting = false
      }
    },

    checkFinished() {
      const now = Date.now()
      const hasMainCards = this.currentIndex < this.cards.length
      const hasDueLearning = this.learningQueue.some(q => q.dueAt <= now)
      const hasPendingLearning = this.learningQueue.length > 0

      if (!hasMainCards && !hasPendingLearning) {
        this.finished = true
      } else if (!hasMainCards && hasPendingLearning && !hasDueLearning) {
        // All main cards done, waiting for learning cards — don't mark finished
      }
    },
  },
})
