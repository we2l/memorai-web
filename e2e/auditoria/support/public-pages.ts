import type { ConsoleMessage, Page } from '@playwright/test'
import { expect } from './fixtures'

/** Vue's production build reports a mismatch with this console error, with no details. */
export function expectNoHydrationMismatch(page: Page) {
  const seen: string[] = []
  const listener = (m: ConsoleMessage) => { if (/hydrat/i.test(m.text())) seen.push(m.text()) }
  page.on('console', listener)
  return { check: () => expect(seen).toEqual([]) }
}

/** GET /api/subscription of an account in the state the test needs; Stripe itself is never called. */
export async function mockSubscription(page: Page, over: Record<string, unknown>) {
  const data = { plan: 'free', billing: null, subscription_status: null, subscription_ends_at: null, has_subscription: false, plan_expires_at: null, in_grace_period: false, grace_ends_at: null, can_renew_annual: true, monthly_scheduled: false, ...over }
  await page.route('**/api/subscription', route => route.fulfill({ json: { data } }))
}

/**
 * The catalog with the checkout open (the local API runs without a gateway, "Assinatura em breve"): the real GET /plans
 * with checkout.available true, so /planos shows the paying buttons. Payment routes are not touched.
 */
export async function openCheckout(page: Page) {
  await page.route('**/api/plans', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.data.checkout = { ...(body.data.checkout ?? {}), available: true, public_key: 'TEST-e2e' }
    await route.fulfill({ response: res, json: body })
  })
}
