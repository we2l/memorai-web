import AxeBuilder from '@axe-core/playwright'
import { test, expect, sql, uid, AUDIT_PASSWORD, API } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Onboarding v4 (prd-onboarding-v4 §9; rodada 2: prd-revisao-v5-fase-a): visitante → área → mini-lote binário → resultado
 * com a curva → compromisso (prova e meta) → cadastro enxuto (Turnstile de teste) →
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

/**
 * The 6 cards by keyboard, in the binary of the round 2 (prd-revisao-v5-fase-a RF-F7): the 1st "Não lembrei" (1), the
 * rest "Lembrei" (2); the 1st comes back at the end and gets "Lembrei". No learning steps in the sample: "Lembrei" says
 * 2 days, never "10 min", and each rating answers with the pill.
 */
async function reviewLote(page: Page) {
  for (let i = 0; i < 7; i++) {
    await expect(page.getByTestId('review-card')).toBeVisible()
    if (i < 6) await expect(page.getByTestId('review-batch')).toContainText(`card ${i + 1} de 6`)
    else await expect(page.getByTestId('guest-repeat')).toContainText('Voltou no fim do lote')
    await expect(page.getByTestId('review-ratings')).toHaveCount(0)
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-answer')).toBeVisible()
    await expect(page.getByTestId('review-origin')).toContainText('Lei 8.906/1994')
    await expect(page.getByTestId('review-ratings')).toHaveAttribute('data-mode', 'two')
    // The card that came back: "Lembrei" after "Não lembrei" returns tomorrow (relearned_interval)
    await expect(page.getByTestId('rate-3')).toContainText(i === 6 ? 'amanhã' : 'em 2 dias')
    await expect(page.getByTestId('rate-1')).toContainText('no fim do lote')
    await expect(page.getByTestId('rate-2')).toHaveCount(0)
    await page.keyboard.press(i === 0 ? '1' : '2')
    // The E2 answer band (prd-visual-e2 Fase 2b): a miss waits, with no "Por quê?" (AI asks for an account)
    const band = page.getByTestId('review-feedback')
    await expect(band).toBeVisible()
    if (i === 0) {
      await expect(band).toHaveAttribute('data-kind', 'again')
      await expect(band).toContainText('Ele volta no fim do lote.')
      await expect(band.getByTestId('review-why')).toHaveCount(0)
    }
    if (i === 1) {
      await expect(band).toHaveAttribute('data-kind', 'ok')
      await expect(band).toContainText('Volta em 2 dias.')
    }
    await page.keyboard.press('Enter')
    await expect(band).toHaveCount(0)
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
    await expect(result.getByTestId('guest-remembered')).toContainText('Você lembrou 5 de 6')
    await expect(result.getByTestId('guest-remembered')).toContainText('Dia 1 da sequência')
    await expect(result.getByTestId('guest-repeated')).toContainText('Na segunda vez, você lembrou 1')
    // The agenda in days (no learning steps): 5 in 2 days, the relearned one tomorrow
    await expect(result.getByTestId('guest-agenda')).toContainText('Amanhã')
    await expect(result.getByTestId('guest-agenda')).toContainText('Em 2 dias')
    await expect(result.getByTestId('guest-agenda')).toContainText('5 cards')
    await expect(result.getByTestId('guest-agenda')).not.toContainText('min')
    // The curve in place of the list of intervals
    await expect(result.getByTestId('guest-curve-estimate')).toHaveText('Estimativa')
    await expect(result.getByTestId('guest-curve-svg')).toHaveAttribute('aria-label', /uns 67% em 30 dias/)
    await expect(result).not.toContainText('46 dias')

    // Nothing reached the server before the account: the lote lives on this device
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('baigi-guest-progress') || 'null'))
    expect(stored).toMatchObject({ area: 'oab', done: true })
    expect(stored.reviews).toHaveLength(7)

    // The commitment (RF-F9): an exam date and 2 lotes a day, one screen
    await result.getByTestId('guest-continue').click()
    const commit = page.getByTestId('guest-commit')
    await expect(commit.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(commit).toContainText('Eu te aviso às 19h')
    await commit.getByRole('radio', { name: /Tenho data/ }).check()
    await commit.getByTestId('guest-signup').click()
    await expect(page.getByTestId('guest-exam-date')).toBeVisible()
    await expect(commit).toContainText('Escolha uma data a partir de amanhã')
    const examDate = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10)
    await page.locator('#guest-exam-date').fill(examDate)
    await commit.getByRole('radio', { name: /^2 lotes/ }).check()
    const result2 = commit
    await result2.getByTestId('guest-signup').click()
    await page.waitForURL('**/criar-conta?salvar=1')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('baigi-guest-progress') || 'null'))).toMatchObject({ goal_batches: 2, exam_date: examDate })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Salve seu progresso')
    await expect(page.getByTestId('signup-guest')).toContainText('OAB')

    const email = `e2e-v4-${uid()}@audit.test`
    // Lean sign-up (RF-F10): no name, no checkbox, one line of the Terms
    await expect(page.locator('#name')).toHaveCount(0)
    await expect(page.locator('#accept_terms')).toHaveCount(0)
    await expect(page.getByTestId('signup-terms')).toContainText('você aceita os Termos de Uso')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    const req = page.waitForRequest(r => r.url().endsWith('/api/register') && r.method() === 'POST')
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click()
    const body = (await req).postDataJSON()
    expect(body.accept_terms).toBe(true)
    expect(body.name).toBeUndefined()
    const token = body.captcha_token
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
    // No learning steps in the sample (D10): the 6 rated cards are in review, in days; the commitment is in the account
    expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${email}' and f.state='review'`)).toBe('6')
    expect(sql(`select (length(name) > 0) || '|' || daily_goal_batches || '|' || (review_buttons is null) from users where email='${email}'`)).toBe('true|2|true')
    expect(sql(`select e.title || '|' || e.exam_date::date from exams e join users u on u.id=e.user_id where u.email='${email}'`)).toBe(`Minha prova|${examDate}`)
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
      await page.getByTestId('rate-3').click()
    }
    await expect(page.getByTestId('guest-remembered')).toContainText('Você lembrou 6 de 6')
    await expect(page.getByTestId('guest-agenda')).toContainText('Em 2 dias')
    await page.getByTestId('guest-continue').click()
    // "Ainda não" and 1 lote, the defaults: nothing to fill
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
      await page.keyboard.press(i % 2 ? 'ArrowRight' : '2')
    }
    await expect(page.locator('[data-testid=guest-result] [data-celebration-title]')).toBeFocused()
    await expect(page.locator('h1')).toHaveCount(1)
    expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
  })
})
