import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

/**
 * Anual via Pix/cartão (prd-checkout-anual-pix). Stripe nunca é chamado: checkout e sessão são mockados.
 * Antes de rodar: `docker exec baigi-app php artisan cache:clear` (throttle de login).
 */
const SESSION_ID = 'cs_test_e2e'

const freeStatus = {
  plan: 'free', billing: null, subscription_status: null, subscription_ends_at: null, has_subscription: false,
  plan_expires_at: null, in_grace_period: false, grace_ends_at: null, can_renew_annual: true, monthly_scheduled: false,
}

async function asFreeUser(page: Page) {
  await page.route('**/api/subscription', route => route.fulfill({ json: { data: freeStatus } }))
  await page.route('**/api/me', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.data.plan = 'free'
    await route.fulfill({ response: res, json: body })
  })
}

function pixSession(overrides: Record<string, unknown> = {}) {
  return {
    session_id: SESSION_ID,
    status: 'complete',
    payment_status: 'unpaid',
    payment_method: 'pix',
    pix_qr: {
      data: '00020126580014br.gov.bcb.pix-e2e',
      image_url_png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    },
    plan_active: false,
    plan_expires_at: null,
    ...overrides,
  }
}

test.describe('Checkout anual', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await asFreeUser(page)
  })

  test('/planos abre no anual com os números de GET /api/plans e inicia o checkout anual', async ({ page, request }) => {
    const catalog = (await (await request.get('http://localhost:8037/api/plans')).json()).data
    const annual = catalog.plans.find((p: any) => p.key === 'pro').prices.annual
    const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

    let annualCalled = false
    await page.route('**/api/checkout/annual', (route) => {
      annualCalled = true
      return route.fulfill({ json: { checkout_url: `/checkout/sucesso?session_id=${SESSION_ID}`, session_id: SESSION_ID } })
    })
    await page.route('**/api/checkout/sessions/**', route => route.fulfill({ json: { data: pixSession() } }))

    await page.goto('/planos')
    const copy = `${brl(annual.amount_cents)} no Pix ou ${annual.installments_max}x de ${brl(Math.round(annual.amount_cents / annual.installments_max))} sem juros no cartão`
    await expect(page.getByText(copy)).toBeVisible()

    await page.getByRole('button', { name: 'Assinar anual' }).click()
    await page.waitForURL(`**/checkout/sucesso?session_id=${SESSION_ID}`)
    expect(annualCalled).toBe(true)
    await expect(page.getByRole('heading', { name: 'Aguardando o Pix' })).toBeVisible()
  })

  test('aguardando Pix → Pro ativado pelo polling', async ({ page }) => {
    let calls = 0
    await page.route('**/api/checkout/sessions/**', (route) => {
      calls++
      const data = calls < 2
        ? pixSession()
        : pixSession({ payment_status: 'paid', pix_qr: null, plan_active: true, plan_expires_at: '2027-09-28T15:05:00-03:00' })
      return route.fulfill({ json: { data } })
    })

    await page.goto(`/checkout/sucesso?session_id=${SESSION_ID}`)
    await expect(page.getByAltText(/QR Code do Pix/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Copiar código Pix/ })).toBeVisible()
    await expect(page.getByText(/O código expira em/)).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Pro ativado até 28/09/2027' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: 'Ir para Hoje' })).toBeVisible()
  })

  test('Pix expirado oferece gerar novo código', async ({ page }) => {
    await page.route('**/api/checkout/sessions/**', route => route.fulfill({ json: { data: pixSession({ status: 'expired', pix_qr: null }) } }))

    await page.goto(`/checkout/sucesso?session_id=${SESSION_ID}`)
    await expect(page.getByRole('heading', { name: 'O código Pix expirou' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gerar novo Pix' })).toBeVisible()
  })

  test('sessão de outro usuário mostra "não encontramos"', async ({ page }) => {
    await page.route('**/api/checkout/sessions/**', route => route.fulfill({ status: 404, json: { message: 'Recurso não encontrado.' } }))

    await page.goto(`/checkout/sucesso?session_id=${SESSION_ID}`)
    await expect(page.getByRole('heading', { name: 'Não encontramos este pagamento' })).toBeVisible()
  })

  test('layout em 375px sem scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.route('**/api/checkout/sessions/**', route => route.fulfill({ json: { data: pixSession() } }))

    await page.goto(`/checkout/sucesso?session_id=${SESSION_ID}`)
    await expect(page.getByRole('heading', { name: 'Aguardando o Pix' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
})
