/**
 * Typed product events (prd-analytics-posthog RF-F08). No-op without key or consent; calls made
 * while posthog-js is still loading are replayed after init. Never throws into the caller (RN-A06).
 */
import type { PostHog } from 'posthog-js'
import type { FrontEvent, FrontEventProps } from '~/types/analytics'
import type { User } from '~/types'

export function useAnalytics() {
  function run(fn: (ph: PostHog) => void) {
    try {
      useNuxtApp().$posthog?.run(fn)
    } catch (e) {
      console.warn('[analytics] ignored', e)
    }
  }

  function track<E extends FrontEvent>(event: E, props: FrontEventProps[E]) {
    run(ph => ph.capture(event, props))
  }

  /** UUID + plan only: never e-mail or name (RF-F07). */
  function identify(user: Pick<User, 'id' | 'plan'>) {
    run((ph) => {
      ph.identify(user.id, { plan: user.plan })
      ph.register({ plan: user.plan })
    })
  }

  /** Logout: forget the identity even if consent was revoked meanwhile. */
  function reset() {
    try {
      useNuxtApp().$posthog?.instance?.reset()
    } catch (e) {
      console.warn('[analytics] ignored', e)
    }
  }

  return { track, identify, reset }
}
