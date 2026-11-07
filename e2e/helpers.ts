import fs from 'node:fs'
import { type Page } from '@playwright/test'

// Lazy: playwright.config.ts imports this file (CONSENT_DECIDED) and must not load test fixtures
const sessions = () => require('./auditoria/support/fixtures') as typeof import('./auditoria/support/fixtures')

/**
 * Default user: a dedicated, auto-provisioned audit account (Pro, verified, onboarded). The old
 * default (weslleyadesousa@gmail.com) is a real Google account locally — its password is not
 * "password" and every login of the suite failed with 422 (auditoria 2026-11). Set E2E_EMAIL /
 * E2E_PASSWORD to use another seeded user (e.g. a fresh CI database with E2eSeeder).
 */
export const TEST_USER = {
  email: process.env.E2E_EMAIL || 'e2e-legacy@audit.test',
  password: process.env.E2E_PASSWORD || (process.env.E2E_EMAIL ? 'password' : 'Senha-Audit-2026'),
}

/**
 * Logged-in page without going through the form: one API login per user per run, reused as
 * storageState (the 5/min login throttle is never hit). Use `loginViaForm` to test the form itself.
 */
export async function login(page: Page) {
  const browser = page.context().browser()!
  for (let attempt = 0; attempt < 2; attempt++) {
    const state = JSON.parse(fs.readFileSync(await sessions().cachedLoginState(browser, TEST_USER.email, TEST_USER.password, CONSENT_DECIDED), 'utf8'))
    await page.context().addCookies(state.cookies)
    await page.goto('/hoje')
    await page.waitForLoadState('networkidle')
    if (new URL(page.url()).pathname === '/hoje') return
    sessions().forgetSession(TEST_USER.email) // session died (logout spec, password change): log in again once
  }
  throw new Error(`login(${TEST_USER.email}) não chegou em /hoje: ${page.url()}`)
}

export async function loginViaForm(page: Page, user = TEST_USER) {
  await page.goto('/entrar')
  // /entrar is prerendered: wait for hydration before submitting (else native submit)
  await page.waitForLoadState('networkidle')

  // Ensure fields are visible (scroll if needed on mobile)
  const emailInput = page.locator('#email')
  await emailInput.scrollIntoViewIfNeeded()
  await emailInput.fill(user.email)

  const passwordInput = page.locator('#password')
  await passwordInput.scrollIntoViewIfNeeded()
  await passwordInput.fill(user.password)

  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.scrollIntoViewIfNeeded()
  await submitBtn.click()

  await page.waitForURL('**/hoje', { timeout: 15000 })
}

/**
 * One context per describe: create the page in beforeAll with `sharedPage(browser)` and reuse it
 * in serial tests.
 */
export async function sharedPage(browser: import('@playwright/test').Browser, opts: import('@playwright/test').BrowserContextOptions = {}) {
  const context = await browser.newContext({ baseURL: process.env.E2E_WEB_ORIGIN || 'http://localhost:3000', storageState: CONSENT_DECIDED, ...opts })
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
