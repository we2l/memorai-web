import { defineStore } from 'pinia'

/**
 * Store para geração de estrutura de estudo a partir de PDF.
 * Persiste durante toda a sessão (não se perde ao navegar).
 */
export const useStructureStore = defineStore('structure', {
  state: () => ({
    generating: false,
    fileName: '',
    documentId: null as string | null,
    _pollInterval: null as ReturnType<typeof setInterval> | null,
  }),

  actions: {
    async startGeneration(file: File) {
      const { $api } = useNuxtApp()
      const toast = useToast()
      const auth = useAuthStore()

      const maxMb = auth.user?.plan === 'pro' ? 100 : 50
      if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF.', 'error'); return }
      if (file.size > maxMb * 1024 * 1024) { toast.show(`Maximo ${maxMb}MB.`, 'error'); return }

      this.fileName = file.name
      toast.show('Enviando PDF...')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await $api<any>('/documents', { method: 'POST', body: formData })
        this.documentId = uploadRes.data.id

        await $api('/topics/from-document', { method: 'POST', body: { document_id: this.documentId } })
        this.generating = true
        this._startPolling()
      } catch (e: any) {
        this.generating = false
        this.fileName = ''
        this.documentId = null
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
          const status = res.data.study_structure_status

          if (status === 'completed') {
            this._stopPolling()
            toast.show('Cadernos criados com sucesso!')
            topicStore.fetchTree()
          } else if (status === 'failed') {
            this._stopPolling()
            toast.show('Falha ao criar estrutura. Tente novamente.', 'error')
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
    },
  },
})
