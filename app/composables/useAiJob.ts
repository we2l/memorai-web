import type { AiJob } from '~/types'

/** Carries the user-facing message like an $api error (`e.data.message`). */
export class AiJobError extends Error {
  data: { message: string }
  /** Set when the wait timed out with the job still alive: `wait(jobId)` picks it up without paying again. */
  jobId?: string
  constructor(message: string, jobId?: string) {
    super(message)
    this.name = 'AiJobError'
    this.data = { message }
    this.jobId = jobId
  }
}

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 3 * 60_000 // job timeout 120 s × 2 tries

/**
 * Async AI generations (prd-performance-backend RF-30): the POST answers 202 with an
 * AiJob and GET /ai/jobs/{id} is polled (pollUntil: pauses with hidden tab) until
 * done|failed. `run` resolves with `result` (the old synchronous response body).
 * Call in setup: it captures `$api`.
 */
export function useAiJob() {
  const { $api } = useNuxtApp()

  /** Follows a job until it ends. Timing out does not stop the job: the error carries its id. */
  async function wait<T>(id: string): Promise<T> {
    let job: AiJob<T>
    try {
      job = await pollUntil(async (signal) => {
        const status = await $api<{ data: AiJob<T> }>(`/ai/jobs/${id}`, { signal })
        return status.data
      }, {
        interval: POLL_INTERVAL,
        immediate: false,
        timeout: POLL_TIMEOUT,
        until: j => j.status === 'done' || j.status === 'failed',
      })
    } catch (e) {
      if (e instanceof PollTimeoutError) throw new AiJobError('A geração demorou demais. Tente novamente.', id)
      throw e
    }
    return finished(job)
  }

  function finished<T>(job: AiJob<T>): T {
    if (job.status === 'failed') throw new AiJobError(job.error || 'Não foi possível gerar agora. Tente novamente.')
    return job.result as T
  }

  async function run<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    const res = await $api<{ data: AiJob<T> }>(url, { method: 'POST', body })
    const job = res.data
    return job.status === 'done' || job.status === 'failed' ? finished(job) : wait<T>(job.id)
  }

  return { run, wait }
}
