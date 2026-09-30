import { ref } from 'vue'
import { extractApiMessage, getErrorStatus } from '~/utils/apiErrors'

export interface ApiActionOptions {
  /** Success toast (optional). */
  success?: string
  /** Error toast text; `false` opts out of the toast (caller renders the error). */
  error?: string | false
  /** No UI at all: only console.warn (hook for PostHog later). */
  silent?: boolean
  /** Re-throw the error after handling it. Default false. */
  rethrow?: boolean
  /** Adds a "Tentar de novo" action to the error toast. */
  retry?: () => unknown
}

// 401 → plugin redirects to /entrar; 402 → plugin opens the UpgradeModal
const HANDLED_BY_PLUGIN = new Set([401, 402])

/**
 * Standard feedback for any API call (prd-ux-critica RF-F3.1).
 *
 *   const { run, pending, error } = useApiAction()
 *   await run(() => $api('/x', { method: 'POST' }), { success: 'Salvo' })
 *
 * Resolves with the call result, or `undefined` when it failed (unless `rethrow`).
 */
export function useApiAction() {
  const pending = ref(false)
  const error = ref<unknown>(null)
  const toast = useToast()

  async function run<T>(fn: () => Promise<T>, opts: ApiActionOptions = {}): Promise<T | undefined> {
    pending.value = true
    error.value = null
    try {
      const result = await fn()
      if (opts.success) toast.show(opts.success, 'success')
      return result
    } catch (e) {
      error.value = e
      reportApiError(e, opts)
      if (opts.rethrow) throw e
      return undefined
    } finally {
      pending.value = false
    }
  }

  return { run, pending, error }
}

/** Shared error reporting, usable outside components (stores). */
export function reportApiError(e: unknown, opts: Pick<ApiActionOptions, 'error' | 'silent' | 'retry'> = {}) {
  const status = getErrorStatus(e)
  if (opts.silent) {
    console.warn('[api] silent failure', status ?? 'network', e)
    return
  }
  if (opts.error === false) return
  if (status !== undefined && HANDLED_BY_PLUGIN.has(status)) return

  const message = opts.error ?? extractApiMessage(e)
  useToast().show(message, 'error', opts.retry
    ? { action: { label: 'Tentar de novo', onClick: () => { opts.retry?.() } } }
    : undefined)
}
