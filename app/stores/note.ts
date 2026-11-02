import { defineStore } from 'pinia'
import type { Note, NoteSummary } from '~/types'

/** The list keeps only the summary: the content lives in the editor that opened the note (RF-F1). */
function summaryOf(note: Partial<Note>): Partial<NoteSummary> {
  const { content: _content, ...summary } = note
  return summary
}

export const useNoteStore = defineStore('note', {
  state: () => ({
    notes: [] as NoteSummary[],
    current: null as NoteSummary | null,
    /** Caderno of the last list request: a slower answer of the previous one never replaces it */
    topicId: null as string | null,
    loading: false,
    saving: false,
    error: null as unknown,
  }),

  actions: {
    async fetchForTopic(topicId: string) {
      this.topicId = topicId
      this.loading = true
      this.error = null
      try {
        const { $api } = useNuxtApp()
        const res = await $api<{ data: NoteSummary[] }>(`/topics/${topicId}/notes`)
        if (this.topicId === topicId) this.notes = res.data
      } catch (e) {
        if (this.topicId === topicId) this.error = e
        reportApiError(e, { silent: true })
      } finally {
        if (this.topicId === topicId) this.loading = false
      }
    },

    /** Full note (GET /notes/{id}), opened in the editor; its summary refreshes the list item. */
    async fetchOne(id: string): Promise<Note> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Note }>(`/notes/${id}`)
      this.merge(id, summaryOf(res.data))
      return res.data
    },

    /**
     * "Continuar material" of Hoje (prd-4a-hoje-v3 RF-B4): the API records when the note was opened
     * (at most every 10 min, without touching updated_at). Fire and forget: a failure changes nothing here.
     */
    markOpened(id: string) {
      const { $api } = useNuxtApp()
      // After the caller's own requests (opening the note comes first)
      void Promise.resolve()
        .then(() => $api(`/notes/${id}/opened`, { method: 'POST' }))
        .catch((e: unknown) => reportApiError(e, { silent: true }))
    },

    async create(topicId: string, data: { title: string }): Promise<Note> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Note }>(`/topics/${topicId}/notes`, { method: 'POST', body: data })
      this.notes.unshift({ ...summaryOf(res.data), flashcards_count: res.data.flashcards_count ?? 0 } as NoteSummary)
      return res.data
    },

    async update(id: string, data: { title?: string; content?: Record<string, any> | null; improved?: boolean }) {
      this.saving = true
      try {
        const { $api } = useNuxtApp()
        // The answer is only the note metadata (RF-B3): updated_at is the base of the local draft (useNoteDraft)
        const res = await $api<{ data?: Partial<NoteSummary> }>(`/notes/${id}`, { method: 'PUT', body: data })
        const meta = summaryOf(res?.data ?? {})
        this.merge(id, {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...meta,
          ...(data.improved && !meta.last_ai_transform_at ? { last_ai_transform_at: new Date().toISOString() } : {}),
        })
      } finally {
        this.saving = false
      }
    },

    /** Joins fresh metadata into the list item and the open note (without overwriting editor state). */
    merge(id: string, patch: Partial<NoteSummary>) {
      const idx = this.notes.findIndex(n => n.id === id)
      if (idx !== -1) this.notes[idx] = { ...this.notes[idx]!, ...patch }
      if (this.current?.id === id) this.current = { ...this.current, ...patch }
    },

    async remove(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/notes/${id}`, { method: 'DELETE' })
      this.notes = this.notes.filter(n => n.id !== id)
      if (this.current?.id === id) this.current = null
    },

    async createFlashcard(noteId: string, data: { front: string; back: string; deck_id?: string }) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/notes/${noteId}/flashcards`, { method: 'POST', body: data })
      return res.data
    },
  },
})
