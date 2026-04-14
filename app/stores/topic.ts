import { defineStore } from 'pinia'
import type { Topic } from '~/types'

export const useTopicStore = defineStore('topic', {
  state: () => ({
    tree: [] as Topic[],
    current: null as Topic | null,
    loading: false,
  }),

  actions: {
    async fetchTree() {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/topics')
        this.tree = res.data
      } finally {
        this.loading = false
      }
    },

    async create(data: { name: string; parent_id?: string | null; description?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>('/topics', { method: 'POST', body: data })
      await this.fetchTree()
      return res.data
    },

    async update(id: string, data: { name?: string; description?: string; position?: number }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/topics/${id}`, { method: 'PUT', body: data })
      await this.fetchTree()
      return res.data
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/topics/${id}`, { method: 'DELETE' })
      if (this.current?.id === id) this.current = null
      await this.fetchTree()
    },
  },
})
