import { defineStore } from 'pinia'
import type { Deck } from '~/types'

export const useDeckStore = defineStore('deck', {
  state: () => ({
    decks: [] as Deck[],
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
  },
})
