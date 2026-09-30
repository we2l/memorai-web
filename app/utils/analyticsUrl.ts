/** Query params that carry tokens or identifiers from e-mail links (RF-F05). */
const SECRET_PARAMS = new Set(['t', 'u', 'signature', 'token', 'expires'])

/**
 * Strips the query string from a URL sent to PostHog, keeping only `utm_*` campaign params.
 * Hash is dropped too. Invalid input comes back untouched (never throws).
 */
export function sanitizeAnalyticsUrl(raw: string): string {
  try {
    const url = new URL(raw)
    const kept = new URLSearchParams()
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('utm_') && !SECRET_PARAMS.has(key)) kept.append(key, value)
    })
    const query = kept.toString()
    return `${url.origin}${url.pathname}${query ? `?${query}` : ''}`
  } catch {
    return raw.split(/[?#]/)[0] ?? raw
  }
}

/** URL-bearing properties posthog-js adds on its own. */
export const URL_PROPERTIES = ['$current_url', '$referrer', '$initial_current_url', '$initial_referrer', '$session_entry_url'] as const
