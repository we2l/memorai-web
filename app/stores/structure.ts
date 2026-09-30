import { defineStore } from 'pinia'
import type { Poller } from '~/composables/usePoll'

// Outside the state: a store has no component scope, so we own stop() (usePoll JSDoc)
let poller: Poller | null = null

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
  }),

  actions: {
    async importPdf(file: File) {
      return this.importPdfWithMode(file)
    },

    async importPdfWithMode(file: File, modeData?: { learning_mode: string; target_language?: string; language_level?: string }) {
      const { $api } = useNuxtApp()
      const toast = useToast()
      const auth = useAuthStore()

      const maxMb = auth.user?.plan === 'pro' ? 100 : 50
      if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF.', 'error'); return }
      if (file.size > maxMb * 1024 * 1024) { toast.show(`Maximo ${maxMb}MB.`, 'error'); return }

      this.fileName = file.name
      toast.show('Enviando PDF...')

      try {
        // Upload via XHR for progress (no topic_id → backend creates topic)
        const formData = new FormData()
        formData.append('file', file)
        if (modeData?.learning_mode) formData.append('learning_mode', modeData.learning_mode)
        if (modeData?.target_language) formData.append('target_language', modeData.target_language)
        if (modeData?.language_level) formData.append('language_level', modeData.language_level)

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
      if (this.generating && this.documentId && !poller?.isActive.value) {
        this._startPolling()
      }
    },

    _startPolling() {
      poller?.stop()

      const { $api } = useNuxtApp()
      const toast = useToast()
      const topicStore = useTopicStore()

      poller = usePoll(async (signal) => {
        if (!this.documentId) {
          this._stopPolling()
          return
        }
        const res = await $api<any>(`/documents/${this.documentId}`, { signal })
        const status = res.data.note_generation_status

        if (status === 'completed') {
          this._stopPolling()
          toast.show('Material de estudo pronto!')
          topicStore.fetchTree()
        } else if (status === 'failed') {
          this._stopPolling()
          toast.show('Falha ao gerar material. Tente novamente.', 'error')
        }
        // Network error → usePoll backs off and keeps polling
      }, {
        interval: 4000,
        immediate: false,
        timeout: 5 * 60 * 1000,
        detached: true,
        onTimeout: () => this._stopPolling(),
      })
      poller.start()
    },

    _stopPolling() {
      poller?.stop()
      poller = null
      this.generating = false
      this.fileName = ''
      this.documentId = null
      this.topicId = null
    },
  },
})
