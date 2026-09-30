import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('login e acesso ao dashboard', async ({ page }) => {
  await login(page)
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

  test('cadastro sem aceitar os Termos fica bloqueado no cliente', async ({ page }) => {
    let registerCalls = 0
    await page.route('**/api/register', r => { registerCalls++; return r.continue() })
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await page.fill('#name', 'Sem Aceite')
    await page.fill('#email', `sem-aceite-${Date.now()}@e2e.test`)
    await page.fill('#password', 'password123')
    await page.fill('#password_confirmation', 'password123')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/aceite os Termos/)).toBeVisible()
    expect(registerCalls).toBe(0)
  })
})
