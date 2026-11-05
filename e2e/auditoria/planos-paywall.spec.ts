import { test, expect, gotoApp, apiCall, uid, doc, realGate, sql, USERS } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Planos → checkout (redirect Stripe mockado), Free com cota esgotada → paywall,
 * não verificado tentando IA/checkout. A IA nunca roda: os gates reais (402/403) respondem antes,
 * e `realGate` só deixa a chamada passar depois de checar a pré-condição no banco.
 */
const STRIPE_URL = 'https://checkout.stripe.com/c/pay/cs_test_audit_e2e'

async function stubStripe(page: Page) {
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Stripe Checkout (stub)</title><h1>Stripe stub</h1>' }))
}

async function mockCheckout(page: Page) {
  const calls: string[] = []
  for (const path of ['subscription', 'annual'] as const) {
    await page.route(`**/api/checkout/${path}`, (route) => {
      calls.push(`${path} ${route.request().postData() ?? ''}`)
      return route.fulfill({ json: { checkout_url: STRIPE_URL, session_id: 'cs_test_audit_e2e' } })
    })
  }
  return calls
}

const subscribeButton = (page: Page) => page.getByRole('main').getByRole('button', { name: /^Assinar (anual|Pro)$/ })

test.describe('Planos → checkout (Free)', () => {
  test.use({ auditUser: 'free' })

  test('Assinar abre o checkout da Stripe (anual e mensal)', async ({ page }) => {
    await stubStripe(page)
    const calls = await mockCheckout(page)
    await gotoApp(page, '/planos')
    await expect(page.getByRole('heading', { name: 'Planos', level: 1 })).toBeVisible()
    const first = (await subscribeButton(page).innerText()).trim()
    await subscribeButton(page).click()
    await page.waitForURL(STRIPE_URL)
    await expect(page.getByRole('heading', { name: 'Stripe stub' })).toBeVisible()
    expect(calls[0]).toMatch(first === 'Assinar anual' ? /^annual/ : /^subscription/)

    // Outro ciclo
    await gotoApp(page, '/planos')
    const toggle = page.getByRole('main').getByRole('button', { name: first === 'Assinar anual' ? /Mensal/i : /Anual/i }).or(page.getByRole('main').getByRole('radio', { name: first === 'Assinar anual' ? /Mensal/i : /Anual/i })).first()
    await toggle.click()
    await expect(subscribeButton(page)).not.toHaveText(first)
    await subscribeButton(page).click()
    await page.waitForURL(STRIPE_URL)
    expect(calls).toHaveLength(2)
    expect(new Set(calls.map(c => c.split(' ')[0]))).toEqual(new Set(['annual', 'subscription']))
  })

  test('checkout com erro 500: aviso, continua em /planos e o botão volta a funcionar', async ({ page }) => {
    await page.route('**/api/checkout/**', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await gotoApp(page, '/planos')
    await subscribeButton(page).click()
    await expect(page.getByRole('alert').getByText(/Não foi possível abrir o checkout|Algo deu errado/)).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/planos')
    await expect(subscribeButton(page)).toBeEnabled()
  })
})

test.describe('Planos — link direto', () => {
  test.use({ auditUser: 'free' })

  test('/planos?ciclo=mensal aberto direto (link/e-mail) mostra o mensal', async ({ page }) => {
    await page.goto('/planos?ciclo=mensal')
    await page.waitForLoadState('networkidle')
    // Prerendered: the query only comes back after hydration, and the page follows router.currentRoute
    await expect(subscribeButton(page)).toHaveText('Assinar Pro')
  })
})

test.describe('Paywall: Free com cota de IA esgotada', () => {
  test.use({ auditUser: 'quota' })

  test('"Gerar cards" recebe 402 do servidor e abre o modal de limite → Ver planos', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Cota ${uid()}` })
    await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Material', content: doc('Fotossíntese e clorofila.') })
    const quotaSpent = () => Number(sql(`select coalesce(sum(count),0) from feature_usages f join users u on u.id=f.user_id where u.email='${USERS.quota.email}' and f.feature='cards_ai' and f.period_start <= current_date and f.period_end >= current_date`)) >= 10
    expect(quotaSpent(), 'pré-condição: cota cards_ai esgotada').toBe(true)
    const gate = await realGate(page, /\/api\/ai\/generate-cards$/, 'quota', quotaSpent)

    // The hub of a caderno with material and no cards: "Gerar cards de…" opens the material and its workshop
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('scope-generate').click()
    const modal = page.getByRole('dialog', { name: /^Você usou 10 de 10/ })
    await expect(modal).toBeVisible()
    expect(gate.map(g => g.status)).toEqual([402])
    expect(gate[0].body.code).toBe('feature_limit_reached')
    await modal.getByRole('button', { name: 'Ver planos' }).click()
    await expect(page).toHaveURL(/\/planos/)
  })
})

test.describe('Usuário não verificado', () => {
  test.use({ auditUser: 'unverified' })
  const unverified = () => sql(`select email_verified_at is null from users where email='${USERS.unverified.email}'`) === 't'

  test('banner pede confirmação e IA responde 403 → modal "Confirme seu e-mail"', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await expect(page.getByRole('status').filter({ hasText: 'Confirme seu e-mail' })).toBeVisible()
    const t = await apiCall(page, 'POST', '/topics', { name: `NaoVerif ${uid()}` })
    await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Material', content: doc('Conteúdo para gerar cards.') })
    const gate = await realGate(page, /\/api\/ai\/generate-cards$/, 'unverified', unverified)

    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('scope-generate').click()
    await expect(page.getByRole('dialog', { name: 'Confirme seu e-mail' })).toBeVisible()
    expect(gate.map(g => g.status)).toEqual([403])
    expect(gate[0].body.code).toBe('email_unverified')
  })

  test('checkout também exige e-mail verificado (403 → modal, sem ir à Stripe)', async ({ page }) => {
    // Plano Pro no seed: força a visão de Free para ter o botão Assinar
    await page.route('**/api/me', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.plan = 'free'
      await route.fulfill({ response: res, json: body })
    })
    await page.route('**/api/subscription', route => route.fulfill({ json: { data: { plan: 'free', billing: null, subscription_status: null, subscription_ends_at: null, has_subscription: false, plan_expires_at: null, in_grace_period: false, grace_ends_at: null, can_renew_annual: true, monthly_scheduled: false } } }))
    const gate = await realGate(page, /\/api\/checkout\/(subscription|annual)$/, 'unverified', unverified)
    await gotoApp(page, '/planos')
    await subscribeButton(page).click()
    await expect(page.getByRole('dialog', { name: 'Confirme seu e-mail' })).toBeVisible()
    expect(gate.map(g => g.status)).toEqual([403])
    expect(new URL(page.url()).pathname).toBe('/planos')
  })
})
