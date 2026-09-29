import { defineStore } from 'pinia'
import type { Topic } from '~/types'

export const useTopicStore = defineStore('topic', {
  state: () => ({
    tree: [] as Topic[],
    current: null as Topic | null,
    loading: false,
    error: null as unknown,
  }),

  getters: {
    findById: (state) => {
      function search(id: string, tree: Topic[]): Topic | null {
        for (const t of tree) {
          if (t.id === id) return t
          if (t.children?.length) {
            const found = search(id, t.children)
            if (found) return found
          }
        }
        return null
      }
      return (id: string) => search(id, state.tree)
    },
    /** Root caderno that contains the topic (the deck is inferred from it — RF-B7). */
    rootOf: (state) => {
      function contains(t: Topic, id: string): boolean {
        return t.id === id || !!t.children?.some(c => contains(c, id))
      }
      return (id: string | null | undefined) => (id ? state.tree.find(root => contains(root, id)) ?? null : null)
    },
  },

  actions: {
    async fetchTree() {
      this.loading = true
      this.error = null
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/topics')
        this.tree = res.data
      } catch (e) {
        // The page renders an inline error with "Tentar de novo" (RF-F3.9)
        this.error = e
        reportApiError(e, { silent: true })
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
