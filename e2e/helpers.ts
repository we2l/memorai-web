import { type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.E2E_EMAIL || 'weslleyadesousa@gmail.com',
  password: process.env.E2E_PASSWORD || 'password',
}

export async function login(page: Page) {
  await page.goto('/entrar')
  // /entrar is prerendered: wait for hydration before submitting (else native submit)
  await page.waitForLoadState('networkidle')

  // Ensure fields are visible (scroll if needed on mobile)
  const emailInput = page.locator('#email')
  await emailInput.scrollIntoViewIfNeeded()
  await emailInput.fill(TEST_USER.email)

  const passwordInput = page.locator('#password')
  await passwordInput.scrollIntoViewIfNeeded()
  await passwordInput.fill(TEST_USER.password)

  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.scrollIntoViewIfNeeded()
  await submitBtn.click()

  await page.waitForURL('**/hoje', { timeout: 15000 })
}

/**
 * One login per describe (the login throttle is 5/min): create the page in
 * beforeAll with `sharedPage(browser)` and reuse it in serial tests.
 */
export async function sharedPage(browser: import('@playwright/test').Browser, opts: import('@playwright/test').BrowserContextOptions = {}) {
  const context = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: CONSENT_DECIDED, ...opts })
  const page = await context.newPage()
  await login(page)
  return page
}

/**
 * LGPD banner already answered ("Recusar"), so it does not cover the UI under test.
 * Specs about the banner itself use an empty storage state (e2e/analytics-consent.spec.ts).
 */
export const CONSENT_DECIDED = {
  cookies: [{
    name: 'baigi_consent',
    value: encodeURIComponent(JSON.stringify({ v: '2026-09', analytics: false, ts: 1759000000 })),
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }],
  origins: [],
}

export const json = (data: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(data) })
