// Sanctum SPA CSRF helpers (ADR-020). The XSRF-TOKEN cookie is readable by JS
// on purpose; the session cookie itself is HttpOnly.

let pending: Promise<void> | null = null

export function getXsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

/** Fetches /sanctum/csrf-cookie when there is no token (or when forced). Concurrent calls share one request. */
export function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && getXsrfToken()) return Promise.resolve()
  if (pending) return pending

  const apiOrigin = useRuntimeConfig().public.apiOrigin as string
  pending = $fetch<void>(`${apiOrigin}/sanctum/csrf-cookie`, { credentials: 'include' })
    .then(() => undefined)
    .finally(() => { pending = null })

  return pending
}
