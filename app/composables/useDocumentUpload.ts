/**
 * Single PDF upload flow (prd-ux-critica RF-F5.1): onboarding, "Novo → Importar PDF"
 * and the Material tab all go through here.
 * - validates type and size with the plan limit from GET /api/plans (RN-01: no hardcode);
 * - XHR for progress, session cookie + X-XSRF-TOKEN (ADR-020);
 * - sends `auto_cards` and registers the document in the docStore for polling.
 */
import type { Document, DocumentAutoGeneration, PlanKey } from '~/types'

export interface UploadOptions {
  /** Omit to let the backend create the caderno from the file name. */
  topicId?: string | null
  autoCards?: boolean
  learningMode?: string | null
}

export interface UploadResult {
  document: Document
  topic_id: string
  topic_created: boolean
}

const MB = 1024 * 1024

export function useDocumentUpload() {
  const toast = useToast()
  const config = useRuntimeConfig()
  const { fetchPlans, limitOf } = usePlans()

  const uploading = ref(false)
  const uploadProgress = ref(0)
  // Result of the upload's automatic note generation (null until an upload succeeds)
  const autoGeneration = ref<(DocumentAutoGeneration & { documentId: string }) | null>(null)

  /** Max upload size (MB) of the user's plan, or null when the catalog is unavailable. */
  async function maxSizeMb(): Promise<number | null> {
    await fetchPlans()
    const plan = (useAuthStore().user?.plan ?? 'free') as PlanKey
    return (limitOf(plan) ?? limitOf('free'))?.extras.upload_max_mb ?? null
  }

  /** Client-side check before any request. Returns the error message or null. */
  async function validate(file: File): Promise<string | null> {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) return 'Envie um arquivo PDF.'
    const max = await maxSizeMb()
    if (max !== null && file.size > max * MB) {
      return `O PDF tem ${(file.size / MB).toFixed(1)} MB. O limite do seu plano é ${max} MB.`
    }
    return null
  }

  function send(file: File, opts: UploadOptions): Promise<XMLHttpRequest> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)
      if (opts.topicId) formData.append('topic_id', opts.topicId)
      if (opts.autoCards !== undefined) formData.append('auto_cards', opts.autoCards ? '1' : '0')
      if (opts.learningMode) formData.append('learning_mode', opts.learningMode)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
      }
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(new Error('Sem conexão. Verifique sua internet e tente de novo.'))
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.withCredentials = true
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
      xhr.setRequestHeader('X-XSRF-TOKEN', getXsrfToken() ?? '')
      xhr.send(formData)
    })
  }

  /**
   * Accepts the legacy `(file, topicId)` call. Resolves with the created document
   * (and its caderno) or null when validation/upload failed (a toast was shown).
   */
  async function upload(file: File, optsOrTopicId: UploadOptions | string = {}): Promise<UploadResult | null> {
    const opts: UploadOptions = typeof optsOrTopicId === 'string' ? { topicId: optsOrTopicId } : optsOrTopicId

    const invalid = await validate(file)
    if (invalid) {
      toast.show(invalid, 'error')
      return null
    }

    uploading.value = true
    uploadProgress.value = 0
    autoGeneration.value = null

    try {
      await ensureCsrfCookie()
      let xhr = await send(file, opts)
      if (xhr.status === 419) {
        await ensureCsrfCookie(true)
        xhr = await send(file, opts)
      }

      let body: any = null
      try { body = JSON.parse(xhr.responseText) } catch { /* intencional: resposta sem JSON cai no erro padrão */ }

      if (xhr.status >= 400) {
        if (xhr.status === 403 && body?.code === 'email_unverified') {
          window.dispatchEvent(new CustomEvent('email-unverified'))
        }
        if (xhr.status === 402) {
          window.dispatchEvent(new CustomEvent('feature-limit-reached', {
            detail: { feature: body?.feature, used: body?.used ?? null, limit: body?.limit ?? null, planRequired: body?.plan_required ?? null, resetsAt: body?.resets_at ?? null },
          }))
          return null
        }
        throw new Error(extractApiMessage({ data: body, response: { status: xhr.status } }, body?.message || 'Não foi possível enviar o PDF.'))
      }

      if (body?.data?.id && body?.auto_generation) {
        autoGeneration.value = { documentId: body.data.id, ...body.auto_generation }
      }

      const document = body?.data as Document
      const topicId = (body?.topic_id ?? document?.topic_id ?? opts.topicId) as string

      // Register for polling when the caderno is the one on screen
      const docStore = useDocumentStore()
      if (document?.id && docStore.currentTopicId === topicId) {
        if (!docStore.documents.some(d => d.id === document.id)) docStore.documents.unshift(document)
        docStore.startPolling()
      }

      toast.show('PDF enviado!')
      return { document, topic_id: topicId, topic_created: !!body?.topic_created }
    } catch (e: any) {
      toast.show(e?.message || 'Não foi possível enviar o PDF.', 'error')
      return null
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  return { upload, validate, maxSizeMb, uploading, uploadProgress, autoGeneration }
}
