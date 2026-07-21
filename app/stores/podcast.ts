import { defineStore } from 'pinia'
import type { Podcast, PodcastContentMode, PodcastDuration, PodcastTone, PodcastFormat, PodcastSpeakerConfig } from '~/types'

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

    sessions: (state) => {
      const grouped = new Map<string, Podcast[]>()
      const standalone: Podcast[] = []
      for (const p of state.podcasts) {
        if (p.session_id) {
          const list = grouped.get(p.session_id) || []
          list.push(p)
          grouped.set(p.session_id, list)
        } else {
          standalone.push(p)
        }
      }
      // Sort episodes within sessions
      for (const [, eps] of grouped) {
        eps.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      }
      return { grouped, standalone }
    },
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
      content_mode?: PodcastContentMode
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

    async generateSession(config: {
      topic_id: string
      content_mode?: PodcastContentMode
      episode_count?: number
      tone?: PodcastTone
      format?: PodcastFormat
      speaker_config?: PodcastSpeakerConfig
    }) {
      this.generating = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/podcasts/session', { method: 'POST', body: config })
        const episodes = res.data.episodes as Podcast[]
        this.podcasts.unshift(...episodes)
        return res.data as { session_id: string; episodes: Podcast[] }
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
