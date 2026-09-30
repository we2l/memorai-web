import type { AiJob } from '~/types'

/** Carries the user-facing message like an $api error (`e.data.message`). */
export class AiJobError extends Error {
  data: { message: string }
  constructor(message: string) {
    super(message)
    this.name = 'AiJobError'
    this.data = { message }
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

  async function run<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    const res = await $api<{ data: AiJob<T> }>(url, { method: 'POST', body })
    let job = res.data

    if (job.status !== 'done' && job.status !== 'failed') {
      try {
        job = await pollUntil(async (signal) => {
          const status = await $api<{ data: AiJob<T> }>(`/ai/jobs/${res.data.id}`, { signal })
          return status.data
        }, {
          interval: POLL_INTERVAL,
          immediate: false,
          timeout: POLL_TIMEOUT,
          until: j => j.status === 'done' || j.status === 'failed',
        })
      } catch (e) {
        if (e instanceof PollTimeoutError) throw new AiJobError('A geração demorou demais. Tente novamente.')
        throw e
      }
    }

    if (job.status === 'failed') throw new AiJobError(job.error || 'Não foi possível gerar agora. Tente novamente.')
    return job.result as T
  }

  return { run }
}
