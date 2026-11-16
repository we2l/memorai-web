import { test, expect, gotoApp, apiCall, uid, loginState, forgetSession, USERS, AUDIT_PASSWORD, SESSION_COOKIE } from './support/fixtures'
import type { Browser, BrowserContext, Page } from '@playwright/test'

/**
 * Troca de conta na mesma aba (bug de privacidade de 2026-11-08): a conta A saía, a B entrava sem recarregar a
 * página e via os cadernos da A até recarregar. O servidor estava certo; o estado do cliente (Pinia, SPA) não.
 * Agora toda troca de conta termina numa carga completa da página (utils/accountState.ts).
 */

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' })

/**
 * The form of /entrar. The login throttle (5/min per e-mail, 30/min per IP) can catch this spec, which logs the same
 * account in three times: the form then says "Muitas tentativas. Tente de novo em N segundos." and stays there.
 * Wait what it says and send once more, instead of waiting for a redirect that will not come.
 */
async function loginViaForm(page: Page, email: string) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(AUDIT_PASSWORD)
  const submit = page.locator('button[type="submit"]')
  await submit.click()
  const throttled = page.getByRole('alert').filter({ hasText: 'Muitas tentativas' })
  const outcome = await Promise.race([
    page.waitForURL(url => url.pathname !== '/entrar').then(() => 'in' as const, () => null),
    // The one that loses the race ends with the page: never an unhandled rejection
    throttled.waitFor().then(() => 'throttled' as const, () => null),
  ])
  if (outcome !== 'throttled') return
  const [, n, unit] = (await throttled.innerText()).match(/em (\d+) (segundo|minuto)/) ?? []
  const wait = (Math.min(Number(n || 60) * (unit === 'minuto' ? 60 : 1), 60) + 1) * 1000
  console.log(`[troca de conta] login de ${email} barrado pelo throttle: esperando ${wait / 1000} s`)
  test.setTimeout(test.info().timeout + wait)
  await page.waitForTimeout(wait)
  await submit.click()
}

/** A caderno with a name no other account has, created by that account's own session (5 logins/min per e-mail). */
async function seedNotebook(browser: Browser, storageState: string, prefix: string) {
  const context = await browser.newContext({ storageState })
  const page = await context.newPage()
  try {
    const name = `${prefix} ${uid()}`
    await apiCall(page, 'POST', '/topics', { name })
    return name
  } finally {
    await context.close()
  }
}

/** A sees its caderno in Hoje, Cadernos (SPA navigation) and the search: every store of the app is filled. */
async function useAsA(page: Page, nameA: string) {
  await gotoApp(page, '/hoje')
  await expect(page.getByTestId('home-notebooks')).toContainText(nameA)
  await nav(page).getByRole('link', { name: 'Cadernos' }).click()
  await expect(page.getByRole('main')).toContainText(nameA)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Buscar' })
  await dialog.getByRole('combobox').fill(nameA)
  await expect(dialog.getByRole('option', { name: new RegExp(nameA) })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
}

/** B sees its own caderno and nothing of A, in the same three places. */
async function expectOnlyB(page: Page, nameA: string, nameB: string) {
  await nav(page).getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByTestId('home-notebooks')).toContainText(nameB)
  await expect(page.getByText(nameA)).toHaveCount(0)

  await nav(page).getByRole('link', { name: 'Cadernos' }).click()
  await expect(page.getByRole('main')).toContainText(nameB)
  await expect(page.getByText(nameA)).toHaveCount(0)

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Buscar' })
  const box = dialog.getByRole('combobox')
  await box.fill(nameB)
  await expect(dialog.getByRole('option', { name: new RegExp(nameB) })).toBeVisible()
  await box.fill(nameA)
  // Typing the full name of A must find no caderno of A (only the "Perguntar…" option may show)
  await expect(dialog.getByRole('option', { name: new RegExp(`^(?!Perguntar).*${nameA}`) })).toHaveCount(0)
  await page.keyboard.press('Escape')
}

/**
 * Every answer of the API sets the session cookie again: one still on its way (the search of useAsA, a block of the
 * page) brings the session back right after the cookie is cleared, and the test then waits for a 401 that never
 * comes (A still signed in on /progresso). So: wait for the page to go quiet, clear, and only go on once the API
 * really answers 401 to this context.
 */
async function expireSession(page: Page, context: BrowserContext) {
  await page.waitForLoadState('networkidle')
  await expect.poll(async () => {
    await context.clearCookies({ name: SESSION_COOKIE })
    await context.clearCookies({ name: /^remember_web_/ })
    return apiCall(page, 'GET', '/me').then(() => 200, e => (/→ 401 /.test(String(e)) ? 401 : 0))
  }).toBe(401)
}

test.describe('Troca de conta na mesma aba', () => {
  test('"Sair" da conta A e entrar com a B: nada da A em Hoje, Cadernos e na busca', async ({ browser }) => {
    const stateA = await loginState(browser, 'trocaA', { fresh: true })
    const nameA = await seedNotebook(browser, stateA, 'Arquitetura A')
    const nameB = await seedNotebook(browser, await loginState(browser, 'trocaB'), 'Caderno B')
    const context = await browser.newContext({ storageState: stateA })
    const page = await context.newPage()
    try {
      await useAsA(page, nameA)

      await page.getByRole('banner').getByRole('button', { name: 'Menu da conta' }).click()
      await page.getByRole('menuitem', { name: 'Sair' }).click()
      await page.waitForURL('**/entrar**')
      await page.waitForLoadState('networkidle')

      await loginViaForm(page, USERS.trocaB.email)
      await page.waitForURL('**/hoje')
      await expectOnlyB(page, nameA, nameB)
    } finally {
      await context.close()
      forgetSession(USERS.trocaA.email) // sessão encerrada pelo "Sair"
    }
  })

  test('sessão da A expira (401) e a B entra: nada da A em Hoje, Cadernos e na busca', async ({ browser }) => {
    const stateA = await loginState(browser, 'trocaA', { fresh: true })
    const nameA = await seedNotebook(browser, stateA, 'Arquitetura A')
    const nameB = await seedNotebook(browser, await loginState(browser, 'trocaB'), 'Caderno B')
    const context = await browser.newContext({ storageState: stateA })
    const page = await context.newPage()
    try {
      await useAsA(page, nameA)

      await expireSession(page, context)
      // Any request now answers 401: the plugin sends the person to /entrar?redirect=…
      await nav(page).getByRole('link', { name: 'Progresso' }).click()
      await page.waitForURL('**/entrar?redirect=**')
      await page.waitForLoadState('networkidle')

      await loginViaForm(page, USERS.trocaB.email)
      await page.waitForURL('**/progresso**')
      await expectOnlyB(page, nameA, nameB)
    } finally {
      await context.close()
      forgetSession(USERS.trocaA.email)
    }
  })
})
