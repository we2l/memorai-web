import type { AnkiImportPreview, AnkiImportStatus } from '~/types'

export const useImportStore = defineStore('import', {
  state: () => ({
    importId: null as string | null,
    preview: null as AnkiImportPreview | null,
    status: null as AnkiImportStatus | null,
    uploading: false,
    loading: false,
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

    async fetchPreview() {
      if (!this.importId) return
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/import/${this.importId}/preview`)
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

    async confirm() {
      if (!this.importId) return
      const { $api } = useNuxtApp()
      await $api(`/import/${this.importId}/confirm`, {
        method: 'POST',
        body: { deck_conflicts: this.deckConflicts },
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
      this.importId = null
      this.preview = null
      this.status = null
      this.uploading = false
      this.loading = false
      this.deckConflicts = {}
    },
  },
})
