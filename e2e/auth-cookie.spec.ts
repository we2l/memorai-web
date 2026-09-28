import { test, expect } from '@playwright/test'
import { login } from './helpers'

// Sanctum SPA (ADR-020). Pre-conditions: API on localhost:8037 (docker compose up),
// `nuxt dev` on localhost:3000 and `php artisan db:seed --class=E2eSeeder`.
const API = process.env.E2E_API_ORIGIN || 'http://localhost:8037'
const UNVERIFIED = { email: 'unverified@e2e.test', password: process.env.E2E_PASSWORD || 'password' }

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

test.describe('sessão por cookie', () => {
  test('login cria cookie HttpOnly e nenhum token legível', async ({ page, context }) => {
    await login(page)

    const cookies = await context.cookies()
    const session = cookies.find(c => c.name === 'baigi-session')
    expect(session?.httpOnly).toBe(true)
    expect(cookies.some(c => c.name === 'auth_token')).toBe(false)

    const jsCookies = await page.evaluate(() => document.cookie)
    expect(jsCookies).not.toContain('baigi-session')
  })

  test('recarregar /hoje mantém a sessão', async ({ page }) => {
    await login(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname).toBe('/hoje')
  })

  test('XSRF ausente ou inválido é renovado e a ação mutante funciona', async ({ page, context }) => {
    await login(page)

    // Harmless mutation through the app's own $api (same client the screens use)
    const mutate = () => page.evaluate(async () => {
      const app = (document.querySelector('#__nuxt') as any).__vue_app__
      const res = await app.config.globalProperties.$api('/onboarding/learning-mode', {
        method: 'POST',
        body: { learning_mode: 'general' },
      })
      return res.message as string
    })

    await context.clearCookies({ name: 'XSRF-TOKEN' })
    expect(await mutate()).toBe('Modo de estudo salvo.')

    // Stale token → API answers 419 → $api renews the cookie and retries once
    await context.addCookies([{ name: 'XSRF-TOKEN', value: 'invalido', domain: 'localhost', path: '/' }])
    expect(await mutate()).toBe('Modo de estudo salvo.')
  })

  test('logout encerra a sessão no servidor', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: 'Sair da conta' }).click()
    await page.waitForURL('**/entrar**')

    const me = await page.request.get(`${API}/api/me`, {
      headers: { Accept: 'application/json', Origin: 'http://localhost:3000', Referer: 'http://localhost:3000/' },
    })
    expect(me.status()).toBe(401)
  })
})

test('esqueci minha senha mostra a mensagem genérica', async ({ page }) => {
  await page.goto('/esqueci-senha')
  await page.waitForLoadState('networkidle')
  await page.locator('#email').fill(`ninguem-${Date.now()}@e2e.test`) // unique: 3 requests / 15 min per e-mail
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page.getByText('Se existir uma conta com esse e-mail, enviamos um link')).toBeVisible()
})

test.describe('usuário não verificado', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('banner de verificação legível no mobile', async ({ page }) => {
    await page.goto('/entrar')
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill(UNVERIFIED.email)
    await page.locator('#password').fill(UNVERIFIED.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/hoje', { timeout: 15000 })

    const banner = page.getByRole('status').filter({ hasText: 'Confirme seu e-mail' })
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Reenviar e-mail' })).toBeVisible()
    const box = await banner.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})
