import { test, expect } from '@playwright/test'
import { loginViaForm } from './helpers'

test('login e acesso ao dashboard', async ({ page }) => {
  // The one test that exercises the form (the others reuse an API session: login throttle 5/min)
  await loginViaForm(page)
  await expect(page).toHaveURL(/\/hoje/)
  await expect(page.locator('body')).toBeVisible()
})

test.describe('Páginas públicas (RF-F11)', () => {
  for (const path of ['/termos', '/privacidade', '/ajuda', '/planos']) {
    test(`anônimo acessa ${path} sem redirect`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      expect(new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('h1').first()).toBeVisible()
    })
  }

  test('/planos anônimo oferece "Criar conta grátis" com redirect', async ({ page }) => {
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main a[href="/criar-conta?redirect=/planos"], a[href="/criar-conta?redirect=/planos"]').first()).toBeVisible()
  })

  test('/privacidade tem índice com âncoras navegáveis', async ({ page }) => {
    await page.goto('/privacidade')
    await page.locator('a[href="#direitos"]:visible').first().click()
    await expect(page).toHaveURL(/#direitos$/)
    await expect(page.locator('h2#direitos')).toBeVisible()
  })

  test('cadastro enxuto: sem nome nem checkbox, a linha dos Termos fica à vista e o clique aceita', async ({ page }) => {
    // prd-revisao-v5-fase-a RF-F10, D8: one line of the Terms; the click sends accept_terms (the API still requires it)
    let body: Record<string, unknown> | null = null
    await page.route('**/api/register', (r) => { body = r.request().postDataJSON(); return r.fulfill({ status: 422, json: { message: 'x', errors: { email: ['Este e-mail já está em uso.'] } } }) })
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#name')).toHaveCount(0)
    await expect(page.locator('#accept_terms')).toHaveCount(0)
    await expect(page.getByTestId('signup-terms')).toContainText('Termos de Uso')
    await page.fill('#email', `sem-nome-${Date.now()}@e2e.test`)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect.poll(() => body).toMatchObject({ accept_terms: true })
    expect(body).not.toHaveProperty('name')
  })
})
