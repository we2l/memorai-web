import { defineStore } from 'pinia'
import type { Flashcard, ReviewPayload } from '~/types'

export const useReviewStore = defineStore('review', {
  state: () => ({
    cards: [] as Flashcard[],
    currentIndex: 0,
    flipped: false,
    loading: false,
    submitting: false,
    finished: false,
  }),

  getters: {
    currentCard: (state) => state.cards[state.currentIndex] ?? null,
    total: (state) => state.cards.length,
    reviewed: (state) => state.currentIndex,
    progress: (state) => state.cards.length ? Math.round((state.currentIndex / state.cards.length) * 100) : 0,
  },

  actions: {
    async fetchSession(deckId?: string) {
      this.loading = true
      this.finished = false
      this.currentIndex = 0
      this.flipped = false
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
      if (!this.currentCard || this.submitting) return
      this.submitting = true
      try {
        const { $api } = useNuxtApp()
        await $api('/review', {
          method: 'POST',
          body: { flashcard_id: this.currentCard.id, rating } as ReviewPayload,
        })
        this.flipped = false
        this.currentIndex++
        if (this.currentIndex >= this.cards.length) {
          this.finished = true
        }
      } finally {
        this.submitting = false
      }
    },
  },
})
