import { test, expect } from '@playwright/test'

// Sanctum SPA (ADR-020): prerendered public pages + client-only app shell.

test.describe('páginas públicas pré-renderizadas', () => {
  test.use({ javaScriptEnabled: false })

  test('landing renderiza sem JavaScript', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
  })
})

test('rota privada sem sessão redireciona para /entrar', async ({ page }) => {
  await page.goto('/hoje')
  await page.waitForURL('**/entrar?redirect=**')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/hoje')
})
