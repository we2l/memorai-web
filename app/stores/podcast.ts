import { defineStore } from 'pinia'
import type { Podcast } from '~/types'

export const usePodcastStore = defineStore('podcast', {
  state: () => ({
    podcasts: [] as Podcast[],
    loading: false,
    generating: false,
  }),

  getters: {
    hasPending: (state) => state.podcasts.some(p =>
      ['pending', 'generating_script', 'generating_audio'].includes(p.status),
    ),
    latestReady: (state) => state.podcasts.find(p => p.status === 'ready'),
  },

  actions: {
    async fetchPodcasts() {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/podcasts')
        this.podcasts = res.data
      } finally {
        this.loading = false
      }
    },

    async generate() {
      this.generating = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/podcasts', { method: 'POST' })
        this.podcasts.unshift(res.data)
        return res.data
      } finally {
        this.generating = false
      }
    },

    startPolling() {
      const interval = setInterval(async () => {
        if (!this.hasPending) {
          clearInterval(interval)
          return
        }
        await this.fetchPodcasts()
      }, 5000)
      return interval
    },
  },
})
