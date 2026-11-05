import type { AnkiDestinationType, AnkiImportPreview, AnkiImportStatus } from '~/types'

// Preview runs in a job: API answers 202 { status: 'previewing' } until ready
const PREVIEW_POLL_MS = 2000
const PREVIEW_TIMEOUT_MS = 60000
export const PREVIEW_TIMEOUT_MESSAGE = 'O arquivo está demorando para ser lido. Tente novamente em instantes.'

let mappingSeq = 0

export const useImportStore = defineStore('import', {
  state: () => ({
    importId: null as string | null,
    preview: null as AnkiImportPreview | null,
    status: null as AnkiImportStatus | null,
    uploading: false,
    loading: false,
    /** The mapping of the other destination is on its way */
    mappingLoading: false,
    deckConflicts: {} as Record<string, 'import' | 'skip'>,
  }),

  actions: {
    async upload(file: File) {
      this.uploading = true
      try {
        const { $api } = useNuxtApp()
        const form = new FormData()
        form.append('file', file)
        const res = await $api<any>('/import/anki', { method: 'POST', body: form })
        this.importId = res.data.id
      } finally {
        this.uploading = false
      }
    },

    /** `topicId`: the mapping inside that caderno (GET /import/{id}/preview?topic_id=). */
    async fetchPreview(topicId?: string | null) {
      if (!this.importId) return
      this.loading = true
      const params = topicId ? { topic_id: topicId } : undefined
      try {
        const { $api } = useNuxtApp()
        const startedAt = Date.now()
        let res = await $api<any>(`/import/${this.importId}/preview`, { params })
        while (res.data?.status === 'previewing') {
          if (Date.now() - startedAt >= PREVIEW_TIMEOUT_MS) throw new Error(PREVIEW_TIMEOUT_MESSAGE)
          await new Promise(resolve => setTimeout(resolve, PREVIEW_POLL_MS))
          res = await $api<any>(`/import/${this.importId}/preview`, { params })
        }
        this.preview = res.data
        // Pre-fill conflicts as 'import'
        for (const deck of res.data.decks) {
          if (deck.conflict) {
            this.deckConflicts[deck.name] = 'import'
          }
        }
      } finally {
        this.loading = false
      }
    },

    /** The destination changed on the preview: only the mapping comes again (the last answer wins). */
    async fetchMapping(topicId?: string | null) {
      if (!this.importId || !this.preview) return
      const n = ++mappingSeq
      this.mappingLoading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/import/${this.importId}/preview`, { params: topicId ? { topic_id: topicId } : undefined })
        if (n === mappingSeq && this.preview) this.preview = { ...this.preview, mapping: res.data?.mapping ?? null }
      } catch (e) {
        // The mapping shown stays until the next try; the import itself does not depend on it
        reportApiError(e, { silent: true })
      } finally {
        if (n === mappingSeq) this.mappingLoading = false
      }
    },

    async confirm(destination: { type: AnkiDestinationType; topic_id?: string } = { type: 'new' }) {
      if (!this.importId) return
      const { $api } = useNuxtApp()
      await $api(`/import/${this.importId}/confirm`, {
        method: 'POST',
        body: { deck_conflicts: this.deckConflicts, destination },
      })
      this.status = { status: 'processing', progress_percent: 0 }
    },

    async pollStatus() {
      if (!this.importId) return
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/import/${this.importId}/status`)
      this.status = res.data
    },

    reset() {
      mappingSeq++
      this.importId = null
      this.preview = null
      this.status = null
      this.uploading = false
      this.loading = false
      this.mappingLoading = false
      this.deckConflicts = {}
    },
  },
})
