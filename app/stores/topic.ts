import { defineStore } from 'pinia'
import type { Topic } from '~/types'

export const useTopicStore = defineStore('topic', {
  state: () => ({
    tree: [] as Topic[],
    current: null as Topic | null,
    loading: false,
    error: null as unknown,
    /** Deferred deletes (10 s with "Desfazer" — RN-UX-08). */
    pendingDeletes: new Map<string, { topic: Topic; parentId: string | null; index: number; timer: ReturnType<typeof setTimeout> }>(),
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

    /** Removes the topic from the tree now and sends DELETE after `delayMs` (or on flush). */
    scheduleRemove(topic: Topic, delayMs = 10_000) {
      const siblings = topic.parent_id ? (this.findById(topic.parent_id)?.children ?? []) : this.tree
      const index = siblings.findIndex(t => t.id === topic.id)
      if (index === -1) return
      siblings.splice(index, 1)
      if (this.current?.id === topic.id) this.current = null
      const timer = setTimeout(() => { void this.commitRemove(topic.id) }, delayMs)
      this.pendingDeletes.set(topic.id, { topic, parentId: topic.parent_id, index, timer })
    },

    /** "Desfazer" within the window: restores the item without any API call. */
    cancelRemove(id: string): boolean {
      const pending = this.pendingDeletes.get(id)
      if (!pending) return false
      clearTimeout(pending.timer)
      this.pendingDeletes.delete(id)
      this.restore(pending)
      return true
    },

    /** Sends every pending DELETE now (route leave / pagehide). */
    flushRemoves() {
      return Promise.all([...this.pendingDeletes.keys()].map(id => this.commitRemove(id)))
    },

    async commitRemove(id: string) {
      const pending = this.pendingDeletes.get(id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pendingDeletes.delete(id)
      try {
        const { $api } = useNuxtApp()
        await $api(`/topics/${id}`, { method: 'DELETE', keepalive: true } as any)
      } catch (e) {
        this.restore(pending)
        reportApiError(e, { error: `Não foi possível excluir "${pending.topic.name}".` })
      }
    },

    restore(pending: { topic: Topic; parentId: string | null; index: number }) {
      const siblings = pending.parentId ? this.findById(pending.parentId)?.children : this.tree
      if (!siblings) return
      siblings.splice(Math.min(pending.index, siblings.length), 0, pending.topic)
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/topics/${id}`, { method: 'DELETE' })
      if (this.current?.id === id) this.current = null
      await this.fetchTree()
    },
  },
})
