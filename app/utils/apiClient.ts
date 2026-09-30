import type { $Fetch } from 'ofetch'

const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE']

export function isMutating(method?: string): boolean {
  return MUTATING.includes((method || 'GET').toUpperCase())
}

/**
 * Wraps a $fetch instance with the Sanctum SPA CSRF flow (RN-03):
 * ensures the XSRF cookie before mutating requests and, on 419, renews it
 * and retries exactly once.
 */
export function withCsrfRetry(raw: $Fetch, ensureCsrf: (force?: boolean) => Promise<void>): $Fetch {
  const api = async (url: any, opts: any = {}) => {
    if (isMutating(opts.method)) await ensureCsrf()
    try {
      return await raw(url, opts)
    } catch (e: any) {
      const status = e?.response?.status ?? e?.statusCode
      if (status === 419 && !opts.__retried) {
        await ensureCsrf(true)
        return raw(url, { ...opts, __retried: true })
      }
      throw e
    }
  }

  return Object.assign(api, { raw: raw.raw, native: raw.native, create: raw.create }) as unknown as $Fetch
}
