/**
 * Composable para upload de PDF a um topic.
 * Evita duplicação entre DocumentsInline e cadernos/index.
 */
export function useDocumentUpload() {
  const toast = useToast()
  const config = useRuntimeConfig()

  const uploading = ref(false)
  const uploadProgress = ref(0)

  async function upload(file: File, topicId: string): Promise<boolean> {
    uploading.value = true
    uploadProgress.value = 0
    const token = useCookie('auth_token').value

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', file)
        formData.append('topic_id', topicId)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
        }
        xhr.onload = () => xhr.status < 400 ? resolve() : reject(new Error('Erro ao enviar'))
        xhr.onerror = () => reject(new Error('Erro de rede'))
        xhr.open('POST', `${config.public.apiBase}/documents`)
        xhr.setRequestHeader('Accept', 'application/json')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
      })

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

  return { upload, uploading, uploadProgress }
}
