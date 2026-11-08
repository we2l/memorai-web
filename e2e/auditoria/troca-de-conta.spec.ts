import { test, expect, gotoApp, apiCall, uid, loginState, forgetSession, USERS, AUDIT_PASSWORD } from './support/fixtures'
import type { Browser, BrowserContext, Page } from '@playwright/test'

/**
 * Troca de conta na mesma aba (bug de privacidade de 2026-11-08): a conta A saía, a B entrava sem recarregar a
 * página e via os cadernos da A até recarregar. O servidor estava certo; o estado do cliente (Pinia, SPA) não.
 * Agora toda troca de conta termina numa carga completa da página (utils/accountState.ts).
 */

const nav = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' })

async function loginViaForm(page: Page, email: string) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(AUDIT_PASSWORD)
  await page.locator('button[type="submit"]').click()
}

/** A caderno with a name no other account has, created by that account's own session. */
async function seedNotebook(browser: Browser, key: 'trocaA' | 'trocaB', prefix: string) {
  const context = await browser.newContext({ storageState: await loginState(browser, key) })
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

async function expireSession(context: BrowserContext) {
  await context.clearCookies({ name: 'baigi-session' })
  await context.clearCookies({ name: /^remember_web_/ })
}

test.describe('Troca de conta na mesma aba', () => {
  test('"Sair" da conta A e entrar com a B: nada da A em Hoje, Cadernos e na busca', async ({ browser }) => {
    const nameA = await seedNotebook(browser, 'trocaA', 'Arquitetura A')
    const nameB = await seedNotebook(browser, 'trocaB', 'Caderno B')
    const context = await browser.newContext({ storageState: await loginState(browser, 'trocaA', { fresh: true }) })
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
    const nameA = await seedNotebook(browser, 'trocaA', 'Arquitetura A')
    const nameB = await seedNotebook(browser, 'trocaB', 'Caderno B')
    const context = await browser.newContext({ storageState: await loginState(browser, 'trocaA', { fresh: true }) })
    const page = await context.newPage()
    try {
      await useAsA(page, nameA)

      await expireSession(context)
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
