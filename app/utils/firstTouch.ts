/**
 * First touch (plano-lancamento-organico §1.4 items 1-2): the utm_* and the landing path of the FIRST visit that
 * carried a campaign, kept on this device until sign-up. It goes to the API with POST /register and the Google
 * callback (users.signup_*), so sign-ups are counted per post even without the analytics consent; with consent,
 * PostHog also gets it (register_once). Never overwritten: the first post that brought the person wins.
 */
export const FIRST_TOUCH_KEY = 'baigi-first-touch'

export interface FirstTouch {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  landing: string
  at: string
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const SLUG = /^[A-Za-z0-9._-]{1,100}$/

/** The campaign of a URL (only clean slugs), or null when it has no utm_source. */
export function touchFromUrl(href: string, now: Date = new Date()): FirstTouch | null {
  let url: URL
  try { url = new URL(href) } catch { return null }
  const touch: FirstTouch = { landing: url.pathname.slice(0, 200), at: now.toISOString() }
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key)
    if (value && SLUG.test(value)) touch[key] = value.toLowerCase()
  }
  return touch.utm_source ? touch : null
}

function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export function readFirstTouch(): FirstTouch | null {
  try {
    const raw = storage()?.getItem(FIRST_TOUCH_KEY)
    const parsed = raw ? JSON.parse(raw) as FirstTouch : null
    return parsed && typeof parsed.landing === 'string' ? parsed : null
  } catch { return null }
}

/** Saves the touch of this URL unless one is already stored. */
export function captureFirstTouch(href: string): void {
  if (readFirstTouch()) return
  const touch = touchFromUrl(href)
  if (!touch) return
  try { storage()?.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch)) } catch { /* intencional: sem storage, sem origem */ }
}

/** The `attribution` of POST /register and the Google callback ({} without a stored touch). */
export function attributionPayload(): { attribution?: Omit<FirstTouch, 'at'> } {
  const touch = readFirstTouch()
  if (!touch) return {}
  const { at: _at, ...attribution } = touch
  return { attribution }
}

/** The same touch as PostHog person-less super properties (first_utm_*). */
export function firstTouchProperties(): Record<string, string> {
  const touch = readFirstTouch()
  if (!touch) return {}
  const props: Record<string, string> = { first_landing: touch.landing }
  for (const key of UTM_KEYS) if (touch[key]) props[`first_${key}`] = touch[key] as string
  return props
}
