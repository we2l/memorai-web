import { defineStore } from 'pinia'
import type { Deck } from '~/types'

export const useDeckStore = defineStore('deck', {
  state: () => ({
    decks: [] as Deck[],
    current: null as Deck | null,
    loading: false,
  }),

  actions: {
    async fetchDecks() {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/decks')
        this.decks = res.data
      } finally {
        this.loading = false
      }
    },

    async fetchDeck(id: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/decks/${id}`)
        this.current = res.data
      } finally {
        this.loading = false
      }
    },

    async createDeck(data: { name: string; description?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>('/decks', { method: 'POST', body: data })
      this.decks.unshift(res.data)
      return res.data
    },

    async updateDeck(id: string, data: { name?: string; description?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/decks/${id}`, { method: 'PUT', body: data })
      const idx = this.decks.findIndex(d => d.id === id)
      if (idx !== -1) this.decks[idx] = res.data
      if (this.current?.id === id) this.current = res.data
      return res.data
    },

    async deleteDeck(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/decks/${id}`, { method: 'DELETE' })
      this.decks = this.decks.filter(d => d.id !== id)
      if (this.current?.id === id) this.current = null
    },

    async updateSettings(id: string, data: { learning_steps?: number[]; relearning_steps?: number[]; desired_retention?: number }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/decks/${id}/settings`, { method: 'PUT', body: data })
      if (this.current?.id === id) this.current = res.data
      const idx = this.decks.findIndex(d => d.id === id)
      if (idx !== -1) this.decks[idx] = res.data
      return res.data
    },
  },
})
