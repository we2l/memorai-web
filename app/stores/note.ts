import { defineStore } from 'pinia'
import type { Note } from '~/types'

export const useNoteStore = defineStore('note', {
  state: () => ({
    notes: [] as Note[],
    current: null as Note | null,
    loading: false,
    saving: false,
  }),

  actions: {
    async fetchForTopic(topicId: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/topics/${topicId}/notes`)
        this.notes = res.data
      } finally {
        this.loading = false
      }
    },

    async create(topicId: string, data: { title: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/topics/${topicId}/notes`, { method: 'POST', body: data })
      this.notes.unshift(res.data)
      return res.data
    },

    async update(id: string, data: { title?: string; content?: Record<string, any> | null }) {
      this.saving = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/notes/${id}`, { method: 'PUT', body: data })
        const idx = this.notes.findIndex(n => n.id === id)
        if (idx !== -1) this.notes[idx] = res.data
        if (this.current?.id === id) this.current = res.data
        return res.data
      } finally {
        this.saving = false
      }
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/notes/${id}`, { method: 'DELETE' })
      this.notes = this.notes.filter(n => n.id !== id)
      if (this.current?.id === id) this.current = null
    },

    async createFlashcard(noteId: string, data: { front: string; back: string; deck_id: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/notes/${noteId}/flashcards`, { method: 'POST', body: data })
      return res.data
    },
  },
})
