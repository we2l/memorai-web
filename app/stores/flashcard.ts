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

    async create(deckId: string, data: { front: string; back: string; topic_id?: string; tags?: string[]; front_audio_url?: string; back_audio_url?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/decks/${deckId}/flashcards`, { method: 'POST', body: data })
      this.flashcards.unshift(res.data)
      return res.data
    },

    async update(id: string, data: { front?: string; back?: string; topic_id?: string; tags?: string[]; front_audio_url?: string | null; back_audio_url?: string | null }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/flashcards/${id}`, { method: 'PUT', body: data })
      const idx = this.flashcards.findIndex(f => f.id === id)
      if (idx !== -1) this.flashcards[idx] = res.data
      return res.data
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/flashcards/${id}`, { method: 'DELETE' })
      this.flashcards = this.flashcards.filter(f => f.id !== id)
    },
  },
})
