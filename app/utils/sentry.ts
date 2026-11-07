// What the browser sends to Sentry (plugins/sentry.client.ts): the error and where it happened, never who or what.
// No user, cookies, query strings, request headers besides the user agent, console output or breadcrumb payloads.
// Pure so tests/utils/sentry.test.ts covers it.
import type { Breadcrumb, ErrorEvent } from '@sentry/browser'
import { sanitizeAnalyticsUrl } from '~/utils/analyticsUrl'
import { getErrorStatus } from '~/utils/apiErrors'
import { isChunkLoadError } from '~/utils/chunkRecovery'

/** Errors that are expected or already handled elsewhere: API answers (the API reports its own 5xx), chunk reloads. */
export function isExpectedError(error: unknown): boolean {
  if (!error) return true
  const name = (error as { name?: string }).name
  if (name === 'FetchError' || getErrorStatus(error) !== undefined) return true
  if (isChunkLoadError(error)) return true
  return false
}

function cleanUrl(value: unknown): unknown {
  return typeof value === 'string' ? sanitizeAnalyticsUrl(value) : value
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user
  if (event.request) {
    const ua = event.request.headers?.['User-Agent']
    event.request = {
      url: cleanUrl(event.request.url) as string | undefined,
      ...(ua ? { headers: { 'User-Agent': ua } } : {}),
    }
  }
  event.breadcrumbs = event.breadcrumbs
    ?.map(scrubBreadcrumb)
    .filter((b): b is Breadcrumb => b !== null)
  return event
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  // console.* may print anything (a note, an API body)
  if (crumb.category === 'console') return null
  if (!crumb.data) return crumb
  const data: Record<string, unknown> = {}
  for (const key of ['url', 'from', 'to', 'method', 'status_code']) {
    if (key in crumb.data) data[key] = key === 'method' || key === 'status_code' ? crumb.data[key] : cleanUrl(crumb.data[key])
  }
  return { ...crumb, data }
}
