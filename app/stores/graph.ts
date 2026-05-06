import { defineStore } from 'pinia'
import type { GraphData, TopicConnection, TopicDetails } from '~/types'

export const useGraphStore = defineStore('graph', {
  state: () => ({
    data: null as GraphData | null,
    loading: false,
    selectedNode: null as TopicDetails | null,
    loadingDetails: false,
  }),

  actions: {
    async fetchGraph() {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/topics/graph')
        this.data = res.data
      } finally {
        this.loading = false
      }
    },

    async fetchNodeDetails(topicId: string) {
      this.loadingDetails = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/topics/${topicId}/details`)
        this.selectedNode = res.data
      } finally {
        this.loadingDetails = false
      }
    },

    clearSelection() {
      this.selectedNode = null
    },

    async createConnection(sourceTopicId: string, targetTopicId: string, label?: string) {
      const { $api } = useNuxtApp()
      const res = await $api<any>('/topic-connections', {
        method: 'POST',
        body: { source_topic_id: sourceTopicId, target_topic_id: targetTopicId, label: label || null },
      })
      await this.fetchGraph()
      return res.data as TopicConnection
    },

    async deleteConnection(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/topic-connections/${id}`, { method: 'DELETE' })
      await this.fetchGraph()
    },
  },
})
