/**
 * Edital vira caderno (prd-edital-caderno RF-F1): POST /editais (PDF or pasted text) → AiJob followed by useAiJob
 * until the proposal arrives; apply creates the caderno. Call in setup (useAiJob captures `$api`).
 */
import type { AiJob, EditalApplied, EditalReadResult } from '~/types'

export interface EditalSource {
  file?: File | null
  text?: string
  pageFrom?: number | null
  pageTo?: number | null
}

export function useEditalReader() {
  const { $api } = useNuxtApp()
  const { wait } = useAiJob()

  /** Returns the job id and its result (the proposal, or the editais to choose from). Errors keep `data.message`. */
  async function read(source: EditalSource): Promise<{ jobId: string; result: EditalReadResult }> {
    const form = new FormData()
    if (source.file) {
      form.append('file', source.file)
      if (source.pageFrom && source.pageTo) {
        form.append('page_from', String(source.pageFrom))
        form.append('page_to', String(source.pageTo))
      }
    } else {
      form.append('text', source.text ?? '')
    }
    const res = await $api<{ data: AiJob<EditalReadResult> }>('/editais', { method: 'POST', body: form })
    const job = res.data
    if (job.status === 'failed') throw new AiJobError(job.error || 'Não foi possível ler o edital agora. Tente de novo.')
    const result = job.status === 'done' ? (job.result as EditalReadResult) : await wait<EditalReadResult>(job.id)
    return { jobId: job.id, result }
  }

  async function apply(jobId: string, body: Record<string, unknown>): Promise<EditalApplied> {
    const res = await $api<{ data: EditalApplied }>(`/editais/${jobId}/apply`, { method: 'POST', body })
    return res.data
  }

  return { read, apply }
}
