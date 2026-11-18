import { SLUG, readFirstTouch, saveFirstTouch, type FirstTouch } from '~/utils/firstTouch'

/**
 * The referrer half of the first touch (prd-entrada-primeira-dobra RF-0): a visit without UTM that came from another
 * site records the host it came from as `utm_source`, with `utm_medium: 'referral'`. Out of the entry chunk: the
 * plugin (plugins/first-touch.client.ts) imports it only when there is a referrer and no touch stored. The API keeps
 * the same contract (users.signup_*, slug of up to 100 characters), so a source with a dot is a referrer and one
 * without is a campaign link.
 */
/** Pages where a person lands from outside. The rest (Google callback, links of e-mails, the app) never record a referrer. */
const REFERRER_PATHS = ['/', '/entrar', '/criar-conta', '/planos', '/ajuda', '/quem-faz']
const REFERRER_PREFIXES = ['/comecar', '/blog', '/ferramentas', '/editais']
/** Hosts that only send people back to us (OAuth, our own subdomains): never an origin. */
const IGNORED_REFERRERS = /(^|\.)baigi\.com\.br$|^accounts\.google\.|^localhost$|^127\.0\.0\.1$/
/** Link shims and mobile hosts of the same network: l.instagram.com and m.facebook.com are instagram.com and facebook.com. */
const SHIM_PREFIX = /^(?:www|m|l|lm|mobile)\./

/** The host of the referrer, without the link shim prefixes; null for our own sites, OAuth or anything odd. */
export function referrerSource(referrer: string, ownHost = ''): string | null {
  let url: URL
  try { url = new URL(referrer) } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'android-app:') return null
  const host = url.hostname.toLowerCase()
  if (!host || host === ownHost.toLowerCase() || IGNORED_REFERRERS.test(host)) return null
  const source = host.replace(SHIM_PREFIX, '')
  return SLUG.test(source) ? source : null
}

/** The touch of a visit without UTM that came from another site, or null (typed address, own site, private page). */
export function touchFromReferrer(href: string, referrer: string, now: Date = new Date()): FirstTouch | null {
  let url: URL
  try { url = new URL(href) } catch { return null }
  const path = url.pathname
  if (!REFERRER_PATHS.includes(path) && !REFERRER_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))) return null
  const source = referrerSource(referrer, url.hostname)
  return source ? { utm_source: source, utm_medium: 'referral', landing: path.slice(0, 200), at: now.toISOString() } : null
}

/**
 * Saves the referrer of this visit when no touch is stored. Called only after the UTM had its chance (the prerendered
 * pages get their query back after hydration), so a campaign link never loses to its own referrer.
 */
export function captureReferrerTouch(href: string, referrer: string): void {
  if (readFirstTouch()) return
  const touch = touchFromReferrer(href, referrer)
  if (touch) saveFirstTouch(touch)
}
