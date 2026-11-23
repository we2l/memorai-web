import { sanitizeAnalyticsUrl } from '~/utils/analyticsUrl'

/** True for a person without an account: no automated browser and no session hint (cookie baigi_logged_in). */
export function isVisitor(): boolean {
  try {
    if (navigator.webdriver) return false
    return !/(?:^|;\s*)baigi_logged_in=1/.test(document.cookie)
  } catch { return false }
}

/** What goes to Vercel for one page view: the path and the utm_* only; nothing once the person has logged in. */
export function visitEvent<T extends { url: string }>(event: T): T | null {
  return isVisitor() ? { ...event, url: sanitizeAnalyticsUrl(event.url) } : null
}
