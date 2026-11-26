import { readFirstTouch } from '~/utils/firstTouch'
import { referrerSource } from '~/utils/firstTouchReferrer'

/**
 * The aggregate entry funnel (api POST /public/funnel): one more in the counter of the day, origin and step, with no
 * cookie, no storage and no identifier, so it runs without the analytics consent (Privacidade, "Funil da entrada").
 * The origin is the first touch already kept on the device (utils/firstTouch.ts), or the host of this visit's referrer,
 * or empty (the API reads empty as "direct" and anything off its list as "other"); the piece is the utm_content of the
 * first touch when it is a video id (v027, from the short links /yt27 and /tk27). Nothing leaves for an automated
 * browser or for who has an account (the session hint). Each step counts once per page load. Out of the entry chunk and
 * of the precache: only the /comecar pages, the edital tool, /criar-conta and the landing's header import it (on demand) (ONE_SHOT_SHARED in nuxt.config).
 */
export type FunnelStep = 'comecar_viewed' | 'entry_card_rated' | 'entry_tour_done' | 'guest_batch_done' | 'edital_viewed'
  | 'hero_signup' | 'final_signup' | 'signup_page_viewed'

/** The steps of arriving on a page: counted once the page has been visible for the minimum time. */
export type FunnelArrival = 'comecar_viewed' | 'edital_viewed' | 'signup_page_viewed'

/** A page visible for less than this is a prefetch or a link preview (the API drops it too). */
export const COMECAR_MIN_VISIBLE_MS = 1500

const sent = new Set<FunnelStep>()

/** Only for the tests: a new page load. */
export function resetFunnelCount(): void {
  sent.clear()
}

/** utm_source of the first touch, else the reduced host of the referrer, else empty. */
export function funnelSource(): string {
  const touch = readFirstTouch()
  if (touch?.utm_source) return touch.utm_source
  try {
    return referrerSource(document.referrer, window.location.hostname) ?? ''
  } catch { return '' }
}

/** utm_content of the first touch when it is a video id ("v" + 3 digits), else empty. */
export function funnelPiece(): string {
  const content = readFirstTouch()?.utm_content?.toLowerCase() ?? ''
  return /^v\d{3}$/.test(content) ? content : ''
}

/** False for an automated browser and for who has an account (auth.user or the session hint of the cookie). */
export function mayCountFunnel(loggedIn: boolean): boolean {
  if (typeof navigator === 'undefined' || navigator.webdriver) return false
  if (loggedIn) return false
  try {
    return !/(?:^|;\s*)baigi_logged_in=1/.test(document.cookie)
  } catch { return false }
}

/** Sends one step, at most once per page load. */
export function countFunnelStep(apiBase: string, step: FunnelStep, loggedIn: boolean, ms?: number): void {
  if (sent.has(step) || !mayCountFunnel(loggedIn)) return
  sent.add(step)
  const body = new URLSearchParams({ step, source: funnelSource() })
  const piece = funnelPiece()
  if (piece) body.set('content', piece)
  if (ms !== undefined) body.set('ms', String(Math.round(ms)))
  const url = `${apiBase}/public/funnel`
  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, body)) return
    void fetch(url, { method: 'POST', body, keepalive: true, credentials: 'omit' })
      .catch(() => { /* intencional: contagem perdida não afeta a pessoa */ })
  } catch { /* intencional: contagem perdida não afeta a pessoa */ }
}

/**
 * The arrival step once the page has been visible for COMECAR_MIN_VISIBLE_MS (time in a hidden tab does not count),
 * with the real visible time; nothing while the page is being prerendered by the browser. Returns the cleanup.
 */
export function countPageViewed(apiBase: string, step: FunnelArrival, loggedIn: () => boolean): () => void {
  let visibleMs = 0
  let since: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const doc = document as Document & { prerendering?: boolean }

  const stopTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const fire = () => {
    timer = null
    if (since === null || doc.prerendering) return
    const ms = visibleMs + (performance.now() - since)
    if (ms < COMECAR_MIN_VISIBLE_MS) {
      timer = setTimeout(fire, COMECAR_MIN_VISIBLE_MS - ms)
      return
    }
    cleanup()
    countFunnelStep(apiBase, step, loggedIn(), ms)
  }
  const sync = () => {
    const visible = !doc.prerendering && doc.visibilityState === 'visible'
    if (visible && since === null) {
      since = performance.now()
      stopTimer()
      timer = setTimeout(fire, Math.max(0, COMECAR_MIN_VISIBLE_MS - visibleMs))
    }
    else if (!visible && since !== null) {
      visibleMs += performance.now() - since
      since = null
      stopTimer()
    }
  }
  function cleanup() {
    stopTimer()
    document.removeEventListener('visibilitychange', sync)
    document.removeEventListener('prerenderingchange', sync)
  }

  document.addEventListener('visibilitychange', sync)
  document.addEventListener('prerenderingchange', sync)
  sync()
  return cleanup
}

/** comecar_viewed (the entry of /comecar). */
export function countComecarViewed(apiBase: string, loggedIn: () => boolean): () => void {
  return countPageViewed(apiBase, 'comecar_viewed', loggedIn)
}
