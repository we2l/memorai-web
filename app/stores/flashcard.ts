import { defineStore } from 'pinia'
import type { Flashcard } from '~/types'

export const useFlashcardStore = defineStore('flashcard', {
  state: () => ({
    flashcards: [] as Flashcard[],
    loading: false,
  }),

  actions: {
    async fetchForDeck(deckId: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/decks/${deckId}/flashcards`)
        this.flashcards = res.data
      } finally {
        this.loading = false
      }
    },

    async create(deckId: string, data: { front: string; back?: string; topic_id?: string; tags?: string[]; front_audio_url?: string; back_audio_url?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/decks/${deckId}/flashcards`, { method: 'POST', body: data })
      const cards = Array.isArray(res.data) ? res.data : [res.data]
      this.flashcards.unshift(...cards)
      return res.data
    },

    async update(id: string, data: { front?: string; back?: string; topic_id?: string; tags?: string[]; front_audio_url?: string | null; back_audio_url?: string | null }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/flashcards/${id}`, { method: 'PUT', body: data })
      const cards = Array.isArray(res.data) ? res.data as Flashcard[] : [res.data as Flashcard]
      // Remove old cards from the same cloze group or the single card
      const groupId = cards[0]?.cloze_group_id
      if (groupId) {
        this.flashcards = this.flashcards.filter(f => f.cloze_group_id !== groupId && f.id !== id)
      } else {
        this.flashcards = this.flashcards.filter(f => f.id !== id)
      }
      this.flashcards.unshift(...cards)
      return res.data
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      const card = this.flashcards.find(f => f.id === id)
      await $api(`/flashcards/${id}`, { method: 'DELETE' })
      // Remove all siblings if cloze group
      if (card?.cloze_group_id) {
        this.flashcards = this.flashcards.filter(f => f.cloze_group_id !== card.cloze_group_id)
      } else {
        this.flashcards = this.flashcards.filter(f => f.id !== id)
      }
    },
  },
})
