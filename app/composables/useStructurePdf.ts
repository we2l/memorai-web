/**
 * Composable para upload de PDF e geração de estrutura de estudo (cadernos + tópicos).
 * Gerencia upload, polling de status e banner de progresso.
 */
export function useStructurePdf() {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const topicStore = useTopicStore()

  const fileInput = ref<HTMLInputElement | null>(null)
  const generating = ref(false)

  function trigger() {
    fileInput.value?.click()
  }

  async function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (!file.name.endsWith('.pdf')) { toast.show('Apenas PDF.', 'error'); return }
    if (file.size > 50 * 1024 * 1024) { toast.show('Máximo 50MB.', 'error'); return }

    toast.show('Enviando PDF...')
    try {
      // Upload without topic_id
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await $api<any>('/documents', { method: 'POST', body: formData })
      const documentId = uploadRes.data.id

      // Trigger structure generation
      await $api('/topics/from-document', { method: 'POST', body: { document_id: documentId } })
      generating.value = true

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const res = await $api<any>(`/documents/${documentId}`)
          const status = res.data.study_structure_status
          if (status === 'completed') {
            clearInterval(poll)
            generating.value = false
            toast.show('Cadernos criados com sucesso! 📚')
            topicStore.fetchTree()
          } else if (status === 'failed') {
            clearInterval(poll)
            generating.value = false
            toast.show('Falha ao criar estrutura. Tente novamente.', 'error')
          }
        } catch {
          // Network error — keep polling, don't stop
        }
      }, 4000)

      // Timeout after 5 min
      setTimeout(() => { clearInterval(poll); generating.value = false }, 300000)
    } catch (e: any) {
      toast.show(e?.data?.message || 'Erro ao enviar PDF.', 'error')
    } finally {
      if (fileInput.value) fileInput.value.value = ''
    }
  }

  return { fileInput, generating, trigger, handleFile }
}
