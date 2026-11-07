import { test, expect, uid, AUDIT_PASSWORD } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Captcha Cloudflare Turnstile (M3/M4): cadastro, esqueci a senha e reenvio da verificação.
 * Roda com as chaves de teste oficiais da Cloudflare: o web com NUXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
 * (sempre passa) e a API com TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA. Sem a site key no build, pula.
 * O caso de recusa da Cloudflare (secret 2x...) é coberto pelo CaptchaTest da API e pelo curl do PR.
 */
const RUN_IP = `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`
const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

async function isolateThrottle(page: Page, path: string) {
  await page.route(`**/api/${path}`, async route => route.continue({ headers: { ...(await route.request().allHeaders()), 'x-forwarded-for': RUN_IP } }))
}

async function captchaOn(page: Page) {
  const script = page.waitForResponse(r => r.url().startsWith('https://challenges.cloudflare.com/turnstile/'), { timeout: 10_000 }).catch(() => null)
  return !!(await script)
}

test.describe('Captcha', () => {
  test('cadastro manda o token do Turnstile e cria a conta; o reenvio da verificação também pede o token', async ({ page }) => {
    test.setTimeout(60_000)
    await isolateThrottle(page, 'register')
    const loaded = captchaOn(page)
    await page.goto('/criar-conta')
    test.skip(!(await loaded), 'build sem NUXT_PUBLIC_TURNSTILE_SITE_KEY')

    const email = `e2e-captcha-${uid()}@audit.test`
    await page.locator('#name').fill('Captcha')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.locator('#accept_terms').check()
    const req = page.waitForRequest(r => r.url().endsWith('/api/register') && r.method() === 'POST')
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click()
    expect((await req).postDataJSON().captcha_token).toBe(DUMMY_TOKEN)
    const r = await res
    test.skip(r.status() === 429, 'ambiente: throttle de cadastro esgotado')
    expect(r.status()).toBe(201)

    // Passo 2 do /comecar: a linha discreta tem "reenviar", que só agora carrega o Turnstile
    await page.waitForURL('**/comecar')
    await page.getByRole('radio', { name: 'Outro' }).check()
    await page.getByRole('button', { name: 'Continuar' }).click()
    const line = page.getByTestId('verify-email-line')
    await expect(line).toContainText(email)
    const resend = page.waitForRequest(r => r.url().endsWith('/api/email/verification-notification'))
    const resent = page.waitForResponse(r => r.url().endsWith('/api/email/verification-notification'))
    await line.getByRole('button', { name: 'reenviar' }).click()
    expect((await resend).postDataJSON().captcha_token).toBe(DUMMY_TOKEN)
    expect((await resent).status()).toBe(202)
    await expect(page.getByText('Link enviado. Confira sua caixa de entrada e o spam.')).toBeVisible()
  })

  test('esqueci a senha manda o token e mostra a resposta de sempre', async ({ page }) => {
    await isolateThrottle(page, 'forgot-password')
    const loaded = captchaOn(page)
    await page.goto('/esqueci-senha')
    test.skip(!(await loaded), 'build sem NUXT_PUBLIC_TURNSTILE_SITE_KEY')

    await page.locator('#email').fill(`e2e-ninguem-${uid()}@audit.test`)
    const req = page.waitForRequest(r => r.url().endsWith('/api/forgot-password'))
    await page.getByRole('button', { name: 'Enviar link' }).click()
    expect((await req).postDataJSON().captcha_token).toBe(DUMMY_TOKEN)
    await expect(page.getByTestId('forgot-sent')).toBeVisible()
  })

  test('sem o script do Turnstile, o cadastro avisa em PT-BR e não chama a API', async ({ page }) => {
    let calls = 0
    await page.route('https://challenges.cloudflare.com/**', route => route.abort())
    await page.route('**/api/register', (route) => { calls++; return route.abort() })
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await page.locator('#name').fill('Sem script')
    await page.locator('#email').fill(`e2e-semscript-${uid()}@audit.test`)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.locator('#accept_terms').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()

    const error = page.getByTestId('signup-error')
    test.skip(!(await error.isVisible().catch(() => false)) && calls === 1, 'build sem NUXT_PUBLIC_TURNSTILE_SITE_KEY')
    await expect(error).toHaveText(/verificação anti-robô/)
    expect(calls).toBe(0)
  })

  test('recusa do captcha pela API aparece no formulário, sem texto técnico', async ({ page }) => {
    await page.route('**/api/register', route => route.fulfill({
      status: 422,
      json: { message: 'Dados inválidos.', errors: { captcha_token: ['Não conseguimos confirmar que você não é um robô. Tente a verificação de novo.'] } },
    }))
    const loaded = captchaOn(page)
    await page.goto('/criar-conta')
    test.skip(!(await loaded), 'build sem NUXT_PUBLIC_TURNSTILE_SITE_KEY')
    await page.locator('#name').fill('Recusa')
    await page.locator('#email').fill(`e2e-recusa-${uid()}@audit.test`)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.locator('#accept_terms').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByTestId('signup-error')).toHaveText('Não conseguimos confirmar que você não é um robô. Tente a verificação de novo.')
  })
})
