import AxeBuilder from '@axe-core/playwright'
import { test, expect, sql, uid, AUDIT_PASSWORD, API } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Onboarding v4 (prd-onboarding-v4 §9): visitante → área → mini-lote real → resultado → cadastro (Turnstile de teste) →
 * progresso na conta → material. Nenhuma rota é mockada: o lote vem de GET /onboarding/areas/{area} e vai para a conta
 * por POST /onboarding/guest. Rode com o web buildado com NUXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA e a API
 * com TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA (sem a site key, o cadastro vai sem token e passa igual).
 */
const RUN_IP = `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`
const AI_ROUTE = /\/api\/(ai\/|chat|quizzes|podcasts$|documents\/[^/]+\/(generate|regenerate))/

async function isolateThrottle(page: Page) {
  for (const path of ['register', 'login']) {
    await page.route(`**/api/${path}`, async route => route.continue({ headers: { ...(await route.request().allHeaders()), 'x-forwarded-for': RUN_IP } }))
  }
}

/** The 6 cards by keyboard: the 1st with "De novo", the rest "Bom"; the 1st comes back at the end and gets "Bom". */
async function reviewLote(page: Page) {
  for (let i = 0; i < 7; i++) {
    await expect(page.getByTestId('review-card')).toBeVisible()
    if (i < 6) await expect(page.getByTestId('review-batch')).toContainText(`card ${i + 1} de 6`)
    else await expect(page.getByTestId('guest-repeat')).toContainText('"De novo"')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-answer')).toBeVisible()
    await expect(page.getByTestId('review-origin')).toContainText('Lei 8.906/1994')
    await expect(page.getByTestId('rate-3')).toContainText('10min')
    await page.keyboard.press(i === 0 ? '1' : '3')
  }
}

const reviewsOf = (email: string) => sql(`select count(*) from reviews r join users u on u.id=r.user_id where u.email='${email}'`)

test.describe('Visitante até a conta', () => {
  test('área → lote → resultado → cadastro → progresso na conta → material, sem IA', async ({ page }) => {
    test.setTimeout(120_000)
    await isolateThrottle(page)
    const aiCalls: string[] = []
    page.on('request', (r) => {
      if (AI_ROUTE.test(new URL(r.url()).pathname) && r.method() === 'POST') aiCalls.push(r.url())
    })

    await page.goto('/comecar')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Para o que você estuda?')
    await page.getByTestId('area-oab').click()
    await page.waitForURL('**/comecar/oab')
    await expect(page.getByTestId('review-step')).toHaveText('Exemplo de OAB')
    await reviewLote(page)

    const result = page.getByTestId('guest-result')
    await expect(result.getByTestId('guest-remembered')).toHaveText('Você lembrou 5 de 6')
    await expect(result.getByTestId('guest-repeated')).toContainText('Na segunda vez, você lembrou 1')
    await expect(result.getByTestId('guest-agenda')).toContainText('Em 10 min')
    await expect(result.getByTestId('guest-agenda')).toContainText('6 cards')
    await expect(result.getByTestId('guest-growth')).toContainText('Estimativa')
    await expect(result.getByTestId('guest-growth')).toContainText('10 min, 2 dias, 11 dias, 46 dias e 5 meses')
    await expect(result).toContainText('Eu te aviso às 19h')

    // Nothing reached the server before the account: the lote lives on this device
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('baigi-guest-progress') || 'null'))
    expect(stored).toMatchObject({ area: 'oab', done: true })
    expect(stored.reviews).toHaveLength(7)

    await result.getByTestId('guest-signup').click()
    await page.waitForURL('**/criar-conta?salvar=1')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Salve seu progresso')
    await expect(page.getByTestId('signup-guest')).toContainText('OAB')

    const email = `e2e-v4-${uid()}@audit.test`
    await page.locator('#name').fill('Visitante Novo')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.locator('#accept_terms').check()
    const req = page.waitForRequest(r => r.url().endsWith('/api/register') && r.method() === 'POST')
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const token = (await req).postDataJSON().captcha_token
    test.info().annotations.push({ type: 'captcha', description: token ? `token ${token}` : 'build sem site key' })
    const r = await res
    test.skip(r.status() === 429, 'ambiente: throttle de cadastro esgotado')
    expect(r.status()).toBe(201)

    await page.waitForURL('**/comecar/pronto')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seu progresso está salvo')
    await expect(page.getByTestId('saved-line')).toHaveText('8 cards de OAB, com as 7 avaliações do lote.')
    await expect(page.getByTestId('onboarding-tomorrow')).toContainText('Amanhã')
    await expect(page.getByTestId('onboarding-reminder')).toContainText('19h')
    expect(await page.evaluate(() => localStorage.getItem('baigi-guest-progress'))).toBeNull()

    expect(reviewsOf(email)).toBe('7')
    expect(sql(`select t.name || '|' || t.is_sample || '|' || t.learning_mode from topics t join users u on u.id=t.user_id where u.email='${email}'`)).toBe('Exemplo · Ética da OAB|true|exam')
    expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${email}' and f.state='learning'`)).toBe('6')
    expect(sql(`select (onboarding_completed_at is not null) || '|' || (first_batch_at is not null) || '|' || default_learning_mode from users where email='${email}'`)).toBe('true|true|exam')

    // "Agora com o seu material": the content step without the sample; Anki opens the import
    await page.getByTestId('saved-material').click()
    await expect(page.getByTestId('content-title')).toHaveText('Agora com o seu material')
    await expect(page.getByRole('radio', { name: 'Usar um material de exemplo' })).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Colar uma questão que errei' })).toBeVisible()
    await page.getByRole('radio', { name: 'Trazer do Anki' }).check()
    await page.getByRole('button', { name: 'Importar do Anki' }).click()
    await page.waitForURL('**/importar')

    // Done: the visitor's flow never reopens
    await page.goto('/comecar/oab')
    await page.waitForURL('**/hoje')
    await expect(page.getByTestId('sample-tag').first()).toHaveText('Exemplo')
    expect(aiCalls, 'nenhuma IA no caminho do visitante').toEqual([])
  })
})

test.describe('Quem já tem conta', () => {
  test('faz o lote como visitante e entra: o lote vai para a conta', async ({ page, request }) => {
    test.setTimeout(90_000)
    const email = `e2e-v4-login-${uid()}@audit.test`
    const reg = await request.post(`${API}/register`, {
      headers: { 'X-Forwarded-For': RUN_IP, Accept: 'application/json', Origin: 'http://localhost', Referer: 'http://localhost/' },
      data: { name: 'Antiga', email, password: AUDIT_PASSWORD, accept_terms: true, captcha_token: 'XXXX.DUMMY.TOKEN.XXXX' },
    })
    test.skip(reg.status() === 429, 'ambiente: throttle de cadastro esgotado')
    expect(reg.status()).toBe(201)
    sql(`update users set onboarding_completed_at = now() where email='${email}'`)

    await isolateThrottle(page)
    await page.goto('/comecar/ingles')
    for (let i = 0; i < 6; i++) {
      await page.getByTestId('review-show').click()
      await page.getByTestId('rate-4').click()
    }
    await expect(page.getByTestId('guest-remembered')).toHaveText('Você lembrou 6 de 6')
    await expect(page.getByTestId('guest-agenda')).toContainText('Em 8 dias')
    await page.getByTestId('guest-login').click()
    await page.waitForURL('**/entrar?redirect=/comecar/pronto')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL('**/comecar/pronto')
    await expect(page.getByTestId('saved-line')).toHaveText('8 cards de Inglês, com as 6 avaliações do lote.')
    expect(reviewsOf(email)).toBe('6')
    await page.getByTestId('saved-home').click()
    await page.waitForURL('**/hoje')
  })
})

test.describe('Teclado e axe', () => {
  test('/comecar e o resultado do lote só no teclado, 1 h1 e sem violação séria', async ({ page }) => {
    await page.goto('/comecar')
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
    await expect(page.locator('h1')).toHaveCount(1)
    // Tab reaches the 1st area and Enter opens it
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      if (await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'area-medicina') break
    }
    await page.keyboard.press('Enter')
    await page.waitForURL('**/comecar/medicina')
    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId('review-card')).toBeFocused()
      await page.keyboard.press('Enter')
      await page.keyboard.press('3')
    }
    await expect(page.getByTestId('guest-remembered')).toBeFocused()
    await expect(page.locator('h1')).toHaveCount(1)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  })
})
