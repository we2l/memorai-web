import { defineStore } from 'pinia'
import type { Poller } from '~/composables/usePoll'
import type { Podcast, PodcastContentMode, PodcastDuration, PodcastTone, PodcastFormat, PodcastSpeakerConfig } from '~/types'

const PER_PAGE = 20

// One poller per store (idempotent start). Stores have no component scope: stopPolling() is on the caller.
let poller: Poller | null = null

export const usePodcastStore = defineStore('podcast', {
  state: () => ({
    podcasts: [] as Podcast[],
    loading: false,
    loadingMore: false,
    generating: false,
    page: 1,
    lastPage: 1,
  }),

  getters: {
    hasMore: (state) => state.page < state.lastPage,

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
    // GET /podcasts is paginated ({ data, meta }). Refreshing (polling) reloads page 1 and keeps
    // the older pages already loaded with "Carregar mais".
    async fetchPodcasts(signal?: AbortSignal) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<{ data: Podcast[], meta: { last_page: number } }>('/podcasts', { params: { page: 1, per_page: PER_PAGE }, signal })
        if (this.page <= 1) {
          this.podcasts = res.data
          this.lastPage = res.meta.last_page
        } else {
          const freshIds = new Set(res.data.map(p => p.id))
          this.podcasts = [...res.data, ...this.podcasts.filter(p => !freshIds.has(p.id))]
        }
      } finally {
        this.loading = false
      }
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      try {
        const { $api } = useNuxtApp()
        const next = this.page + 1
        const res = await $api<{ data: Podcast[], meta: { last_page: number } }>('/podcasts', { params: { page: next, per_page: PER_PAGE } })
        const known = new Set(this.podcasts.map(p => p.id))
        this.podcasts.push(...res.data.filter(p => !known.has(p.id)))
        this.page = next
        this.lastPage = res.meta.last_page
      } finally {
        this.loadingMore = false
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

    /** Polls while some podcast is pending. Idempotent: one poller per store. */
    startPolling() {
      if (!this.hasPending) return
      poller ??= usePoll(signal => this.fetchPodcasts(signal), {
        interval: 5000,
        immediate: false,
        detached: true,
        until: () => !this.hasPending,
      })
      poller.start()
    },

    stopPolling() {
      poller?.stop()
    },

    async deletePodcast(podcastId: string) {
      const { $api } = useNuxtApp()
      await $api(`/podcasts/${podcastId}`, { method: 'DELETE' })
      this.podcasts = this.podcasts.filter(p => p.id !== podcastId)
    },
  },
})
