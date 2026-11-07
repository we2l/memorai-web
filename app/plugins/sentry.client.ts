/**
 * Sentry in the browser: technical errors only, after the analytics consent (same rule as PostHog, ADR-031).
 * - No NUXT_PUBLIC_SENTRY_DSN, or no consent: @sentry/browser is never downloaded (dynamic import, `analytics-*`
 *   chunk: no prefetch and out of the SW precache, nuxt.config).
 * - Errors of the page before the SDK arrives wait in a short queue; refused consent drops them.
 * - No tracing, replay or session pings; utils/sentry.ts strips user, cookies, query strings and console output.
 */
import { isExpectedError, scrubBreadcrumb, scrubEvent } from '~/utils/sentry'

type SentrySdk = typeof import('~/utils/sentryClient')

const MAX_QUEUED = 20

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const dsn = String(config.sentryDsn || '')
  if (!dsn) return

  const { analytics } = useConsent()
  const queue: unknown[] = []
  const seen = new WeakSet<object>()
  let sdk: SentrySdk | null = null
  let loading: Promise<SentrySdk | null> | null = null

  function capture(error: unknown) {
    if (analytics.value === false || isExpectedError(error)) return
    // vue:error and app:error can carry the same error
    if (typeof error === 'object' && error) {
      if (seen.has(error)) return
      seen.add(error)
    }
    if (sdk) sdk.captureException(error)
    else if (queue.length < MAX_QUEUED) queue.push(error)
  }

  function load() {
    loading ??= import('~/utils/sentryClient')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          release: String(config.appVersion || 'dev'),
          environment: String(config.sentryEnvironment || 'production'),
          // v11: replaces sendDefaultPii; nothing about the person or the request body
          dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
          tracesSampleRate: 0,
          maxBreadcrumbs: 30,
          // Picked by hand (the default set brings session pings): errors, their causes and a few breadcrumbs only
          defaultIntegrations: false,
          integrations: [
            Sentry.eventFiltersIntegration(),
            Sentry.functionToStringIntegration(),
            Sentry.browserApiErrorsIntegration(),
            // No consoleIntegration: console output never becomes a breadcrumb
            Sentry.breadcrumbsIntegration(),
            Sentry.globalHandlersIntegration(),
            Sentry.linkedErrorsIntegration(),
            Sentry.dedupeIntegration(),
            Sentry.httpContextIntegration(),
          ],
          ignoreErrors: [/ResizeObserver loop/, 'Non-Error promise rejection captured'],
          beforeBreadcrumb: crumb => scrubBreadcrumb(crumb),
          beforeSend: (event, hint) => {
            if (analytics.value !== true || isExpectedError(hint.originalException)) return null
            return scrubEvent(event)
          },
        })
        sdk = Sentry
        for (const error of queue.splice(0)) Sentry.captureException(error)
        return Sentry
      })
      .catch((e) => {
        // Blocked by an extension or offline: the app goes on without error reporting
        console.warn('[sentry] not loaded', e)
        loading = null
        return null
      })
    return loading
  }

  nuxtApp.hook('vue:error', error => capture(error))
  nuxtApp.hook('app:error', error => capture(error))
  // Before the SDK: its own global handlers take over once loaded
  window.addEventListener('error', (event) => { if (!sdk) capture(event.error) })
  window.addEventListener('unhandledrejection', (event) => { if (!sdk) capture(event.reason) })

  watch(analytics, (value) => {
    if (value === true) void load()
    else if (value === false) queue.length = 0
  }, { immediate: true })
})
