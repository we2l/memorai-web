import { defineStore } from 'pinia'
import type { Podcast, PodcastDuration, PodcastTone, PodcastFormat, PodcastSpeakerConfig } from '~/types'

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

    async generate(config: {
      topic_id: string
      duration?: PodcastDuration
      tone?: PodcastTone
      format?: PodcastFormat
      speaker_config?: PodcastSpeakerConfig
    }) {
      this.generating = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/podcasts', { method: 'POST', body: config })
        this.podcasts.unshift(res.data)
        return res.data as Podcast
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
