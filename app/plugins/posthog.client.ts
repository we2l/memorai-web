/**
 * PostHog, client-only and consent-gated (prd-analytics-posthog F2, ADR-024).
 * - No key → nothing happens. No consent → `posthog-js` is never downloaded (dynamic import,
 *   no prefetch, out of the SW precache — nuxt.config).
 * - Autocapture, replay, surveys and remote extensions off: explicit events only (A5).
 * - Manual SPA pageviews with sanitized URLs; revoke → opt_out + reset (RN-A04).
 */
import type { PostHog, CaptureResult } from 'posthog-js'
import type { Ref } from 'vue'
import { sanitizeAnalyticsUrl, URL_PROPERTIES } from '~/utils/analyticsUrl'

type PosthogCall = (ph: PostHog) => void

export interface PosthogHandle {
  readonly instance: PostHog | null
  /** Runs now, or right after the lazy init when consent is given but the SDK is still loading. */
  run: (fn: PosthogCall) => void
}

export interface PosthogSetup {
  key: string
  apiHost: string
  uiHost: string
  appVersion: string
  analytics: Ref<boolean | null>
  user: () => { id: string, plan: string } | null
  routeName: () => unknown
  loader?: () => Promise<{ default: PostHog }>
}

/** Calls made before posthog-js finished loading (e.g. the first onboarding step). */
const MAX_PENDING = 50

export function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event
  for (const prop of URL_PROPERTIES) {
    const value = event.properties[prop]
    if (typeof value === 'string') event.properties[prop] = sanitizeAnalyticsUrl(value)
  }
  return event
}

export function createPosthogHandle(setup: PosthogSetup) {
  const pending: PosthogCall[] = []
  const handle: { instance: PostHog | null, run: (fn: PosthogCall) => void } = {
    instance: null,
    run: (fn) => {
      if (setup.analytics.value !== true) return
      if (handle.instance) fn(handle.instance)
      else if (pending.length < MAX_PENDING) pending.push(fn)
    },
  }
  let loading: Promise<PostHog | null> | null = null

  function pageview() {
    const name = setup.routeName()
    handle.instance?.capture('$pageview', {
      $current_url: sanitizeAnalyticsUrl(window.location.href),
      route_name: typeof name === 'string' ? name : null,
    })
  }

  function load(): Promise<PostHog | null> {
    loading ??= (setup.loader ?? (() => import('posthog-js')))()
      .then(({ default: posthog }) => {
        posthog.init(setup.key, {
          api_host: setup.apiHost,
          ui_host: setup.uiHost,
          person_profiles: 'identified_only',
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          disable_surveys: true,
          disable_web_experiments: true,
          disable_external_dependency_loading: true,
          capture_exceptions: false,
          capture_dead_clicks: false,
          capture_heatmaps: false,
          capture_performance: false,
          rageclick: false,
          persistence: 'localStorage+cookie',
          before_send: sanitizeEvent,
        })
        posthog.register({ app_version: setup.appVersion })
        handle.instance = posthog
        return posthog
      })
      .catch((e) => {
        // Blocked by an extension or offline: the app goes on without analytics (RN-A06)
        console.warn('[analytics] posthog-js not loaded', e)
        loading = null
        return null
      })
    return loading
  }

  async function enable() {
    const ph = await load()
    if (!ph || setup.analytics.value !== true) return
    if (ph.has_opted_out_capturing()) ph.opt_in_capturing()
    const user = setup.user()
    if (user) {
      ph.identify(user.id, { plan: user.plan })
      ph.register({ plan: user.plan })
    }
    pageview()
    for (const fn of pending.splice(0)) {
      try { fn(ph) } catch (e) { console.warn('[analytics] ignored', e) }
    }
  }

  function disable() {
    pending.length = 0
    const ph = handle.instance
    if (!ph) return
    ph.opt_out_capturing()
    ph.reset()
  }

  /** Reacts to the consent state (null = undecided: nothing happens). */
  function onConsent(value: boolean | null): Promise<void> | void {
    if (value === true) return enable()
    if (value === false) disable()
  }

  function onNavigate(toPath: string, fromPath: string) {
    if (setup.analytics.value === true && handle.instance && toPath !== fromPath) pageview()
  }

  return { handle: handle as PosthogHandle, onConsent, onNavigate }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const key = String(config.posthogKey || '')

  if (!key) {
    const noop: PosthogHandle = { instance: null, run: () => {} }
    return { provide: { posthog: noop } }
  }

  const router = useRouter()
  const auth = useAuthStore()
  const { analytics } = useConsent()

  const ph = createPosthogHandle({
    key,
    apiHost: String(config.posthogHost || '/ingest'),
    uiHost: String(config.posthogUiHost || 'https://eu.posthog.com'),
    appVersion: String(config.appVersion || 'dev'),
    analytics,
    user: () => auth.user,
    routeName: () => router.currentRoute.value.name,
  })

  watch(analytics, value => ph.onConsent(value), { immediate: true })
  router.afterEach((to, from) => ph.onNavigate(to.path, from.path))

  return { provide: { posthog: ph.handle } }
})

declare module '#app' {
  interface NuxtApp {
    $posthog: PosthogHandle
  }
}
