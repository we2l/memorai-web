import { defineStore } from 'pinia'

/**
 * Store para importação de PDF.
 * Upload sem topic_id → backend cria caderno + gera nota + fragmenta automaticamente.
 * Persiste durante toda a sessão.
 */
export const useStructureStore = defineStore('structure', {
  state: () => ({
    generating: false,
    fileName: '',
    documentId: null as string | null,
    topicId: null as string | null,
    _pollInterval: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    async importPdf(file: File) {
      const { $api } = useNuxtApp()
      const toast = useToast()
      const auth = useAuthStore()

      const maxMb = auth.user?.plan === 'pro' ? 100 : 50
      if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF.', 'error'); return }
      if (file.size > maxMb * 1024 * 1024) { toast.show(`Maximo ${maxMb}MB.`, 'error'); return }

      this.fileName = file.name
      toast.show('Enviando PDF...')

      try {
        const config = useRuntimeConfig()
        const token = useCookie('auth_token').value

        // Upload via XHR for progress (no topic_id → backend creates topic)
        const formData = new FormData()
        formData.append('file', file)

        const res = await $api<any>('/documents', { method: 'POST', body: formData })
        this.documentId = res.data.id
        this.topicId = res.topic_id
        this.generating = true

        toast.show('Gerando material de estudo...')
        this._startPolling()
      } catch (e: any) {
        this.generating = false
        this.fileName = ''
        this.documentId = null
        this.topicId = null
        toast.show(e?.data?.message || 'Erro ao enviar PDF.', 'error')
      }
    },

    /** Resume polling if page was remounted while still generating */
    resumeIfNeeded() {
      if (this.generating && this.documentId && !this._pollInterval) {
        this._startPolling()
      }
    },

    _startPolling() {
      if (this._pollInterval) clearInterval(this._pollInterval)

      const { $api } = useNuxtApp()
      const toast = useToast()
      const topicStore = useTopicStore()

      this._pollInterval = setInterval(async () => {
        if (!this.documentId) { this._stopPolling(); return }

        try {
          const res = await $api<any>(`/documents/${this.documentId}`)
          const status = res.data.note_generation_status

          if (status === 'completed') {
            this._stopPolling()
            toast.show('Material de estudo pronto!')
            topicStore.fetchTree()
          } else if (status === 'failed') {
            this._stopPolling()
            toast.show('Falha ao gerar material. Tente novamente.', 'error')
          }
        } catch {
          // Network error — keep polling
        }
      }, 4000)

      // Timeout after 5 min
      setTimeout(() => this._stopPolling(), 300000)
    },

    _stopPolling() {
      if (this._pollInterval) {
        clearInterval(this._pollInterval)
        this._pollInterval = null
      }
      this.generating = false
      this.fileName = ''
      this.documentId = null
      this.topicId = null
    },
  },
})
