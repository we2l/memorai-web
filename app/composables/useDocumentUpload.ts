/**
 * Composable para upload de PDF a um topic.
 * Evita duplicação entre DocumentsInline, cadernos/index e comecar.
 * XHR (para progresso) com cookie de sessão + X-XSRF-TOKEN (ADR-020).
 */
import type { DocumentAutoGeneration } from '~/types'

export function useDocumentUpload() {
  const toast = useToast()
  const config = useRuntimeConfig()

  const uploading = ref(false)
  const uploadProgress = ref(0)
  // Result of the upload's automatic note generation (null until an upload succeeds)
  const autoGeneration = ref<(DocumentAutoGeneration & { documentId: string }) | null>(null)

  function send(file: File, topicId: string): Promise<XMLHttpRequest> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('topic_id', topicId)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(new Error('Erro de rede'))
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.withCredentials = true
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
      xhr.setRequestHeader('X-XSRF-TOKEN', getXsrfToken() ?? '')
      xhr.send(formData)
    })
  }

  async function upload(file: File, topicId: string): Promise<boolean> {
    uploading.value = true
    uploadProgress.value = 0
    autoGeneration.value = null

    try {
      await ensureCsrfCookie()
      let xhr = await send(file, topicId)
      if (xhr.status === 419) {
        await ensureCsrfCookie(true)
        xhr = await send(file, topicId)
      }

      if (xhr.status >= 400) {
        let data: any = null
        try { data = JSON.parse(xhr.responseText) } catch {}
        if (xhr.status === 403 && data?.code === 'email_unverified') {
          window.dispatchEvent(new CustomEvent('email-unverified'))
        }
        throw new Error(data?.message || 'Erro ao enviar')
      }

      let body: any = null
      try { body = JSON.parse(xhr.responseText) } catch {}
      if (body?.data?.id && body?.auto_generation) {
        autoGeneration.value = { documentId: body.data.id, ...body.auto_generation }
      }

      toast.show('PDF enviado!')
      return true
    } catch (e: any) {
      toast.show(e?.message || 'Erro ao enviar', 'error')
      return false
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  return { upload, uploading, uploadProgress, autoGeneration }
}
