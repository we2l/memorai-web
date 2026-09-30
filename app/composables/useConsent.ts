/**
 * LGPD analytics consent (prd-analytics-posthog F1, RN-A01/A05).
 * Source of truth on the device: cookie `baigi_consent` (JSON, 12 months, readable by JS).
 * A cookie from an older policy version counts as "not decided" → the banner comes back.
 * The PostHog plugin watches `analytics`: nothing is loaded while it is not `true`.
 */
import type { User } from '~/types'

export const CURRENT_CONSENT_VERSION = '2026-09'
export const CONSENT_COOKIE = 'baigi_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

export interface ConsentCookie {
  v: string
  analytics: boolean
  /** Unix seconds of the choice (sync: most recent wins). */
  ts: number
}

function cookieRef() {
  return useCookie<ConsentCookie | null>(CONSENT_COOKIE, {
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    path: '/',
    secure: import.meta.client && location.protocol === 'https:',
    default: () => null,
  })
}

function isValid(c: unknown): c is ConsentCookie {
  return !!c && typeof c === 'object'
    && (c as ConsentCookie).v === CURRENT_CONSENT_VERSION
    && typeof (c as ConsentCookie).analytics === 'boolean'
}

export function useConsent() {
  const state = useState<ConsentCookie | null>('consent', () => null)
  // Prerendered pages hydrate `null` from the build: the browser cookie is the source of truth.
  if (import.meta.client && state.value === null) {
    const c = cookieRef().value
    if (isValid(c)) state.value = c
  }

  /** true/false once decided for the current version; null shows the banner. */
  const analytics = computed<boolean | null>(() => state.value?.analytics ?? null)

  function write(value: boolean, ts = Math.floor(Date.now() / 1000)) {
    const next: ConsentCookie = { v: CURRENT_CONSENT_VERSION, analytics: value, ts }
    cookieRef().value = next
    state.value = next
  }

  async function push(value: boolean) {
    const auth = useAuthStore()
    if (!auth.user) return
    try {
      const res = await useNuxtApp().$api<{ data: { analytics_consent: boolean, analytics_consent_at: string | null } }>('/consent', {
        method: 'PUT',
        body: { analytics: value, version: CURRENT_CONSENT_VERSION },
      })
      if (auth.user) {
        auth.user.analytics_consent = res.data.analytics_consent
        auth.user.analytics_consent_at = res.data.analytics_consent_at
      }
    } catch (e) {
      // The cookie already holds the choice; the next login retries the sync.
      reportApiError(e, { silent: true })
    }
  }

  /** Records a choice on the device and, when logged in, on the account. */
  async function set(value: boolean) {
    write(value)
    await push(value)
  }

  const accept = () => set(true)
  const reject = () => set(false)

  /**
   * Login/sign-up/`/me` (RF-F01): server null + cookie → PUT; server set + no cookie →
   * write the cookie; both set and different → the most recent `ts` wins.
   */
  async function syncWithServer(user: Pick<User, 'analytics_consent' | 'analytics_consent_at'>) {
    const server = user.analytics_consent ?? null
    const serverTs = user.analytics_consent_at ? Math.floor(Date.parse(user.analytics_consent_at) / 1000) : 0
    const local = state.value

    if (server === null) {
      if (local) await push(local.analytics)
      return
    }
    if (!local) {
      write(server, serverTs || undefined)
      return
    }
    if (local.analytics === server) return
    if (local.ts > serverTs) await push(local.analytics)
    else write(server, serverTs)
  }

  /** Banner choice sent with register / Google callback (RF-B04). */
  function signupPayload(): { analytics_consent?: boolean } {
    return state.value ? { analytics_consent: state.value.analytics } : {}
  }

  return { analytics, accept, reject, set, syncWithServer, signupPayload }
}
