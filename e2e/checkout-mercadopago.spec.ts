import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

/**
 * Checkout transparente do Mercado Pago (prd-pagamento-mercado-pago RF-F1 a RF-F3). The API's checkout routes are
 * mocked (the screen only reads our state); the card form is the real Card Payment Brick when MP_PUBLIC_KEY is set
 * (sandbox public key, never committed), and is skipped otherwise.
 */
const CHECKOUT_ID = '01a1b96d-1b6b-70fd-8d44-9b79ea37563a'
const QR = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='

const freeStatus = {
  plan: 'free', gateway: 'mercadopago', billing: null, subscription_status: null, subscription_ends_at: null, has_subscription: false,
  plan_expires_at: null, in_grace_period: false, grace_ends_at: null, can_renew_annual: true, monthly_scheduled: false,
  can_buy: { monthly_card: true, monthly_pix: true, annual: true }, refundable: null, open_pix: null, card: null,
}

function payment(over: Record<string, unknown> = {}) {
  return {
    id: CHECKOUT_ID, product: 'annual_pix', method: 'pix', status: 'action_required', status_detail: 'waiting_transfer', message: null,
    amount_cents: 22790, installments: null, challenge_url: null, paid_at: null, refundable_until: null, plan_active: false,
    plan_expires_at: null, renews_at: null, created_at: null,
    pix: { qr_code: '00020126580014br.gov.bcb.pix-e2e', qr_code_base64: QR, ticket_url: null, expires_at: new Date(Date.now() + 30 * 60_000).toISOString() },
    ...over,
  }
}

/** The catalog of the local API with the gateway fields of this PRD (the local API may still be on develop). */
async function withCatalog(page: Page) {
  await page.route('**/api/plans', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    const pro = body.data.plans.find((p: any) => p.key === 'pro')
    pro.prices.monthly = { amount_cents: 3490, label: 'R$ 34,90/mês', methods: ['card', 'pix'], pix_days: 30 }
    pro.prices.annual = { amount_cents: 23990, label: 'R$ 239,90/ano', monthly_equivalent_cents: 1999, installments_max: 12, installments_interest_free: 3, installments_interest: 'payer', savings_cents: 17890, methods: ['card', 'pix'], pix: { amount_cents: 22790, label: 'R$ 227,90/ano', discount_percent: 5, savings_cents: 1200 } }
    body.data.checkout = { available: true, gateway: 'mercadopago', public_key: process.env.MP_PUBLIC_KEY || null, seller: { name: 'Fulano de Tal', email: 'contato@baigi.com.br' }, statement_descriptor: 'BAIGI', refund_window_days: 7 }
    await route.fulfill({ response: res, json: body })
  })
}

async function asFreeUser(page: Page) {
  await page.route('**/api/subscription', route => route.fulfill({ json: { data: freeStatus } }))
  await page.route('**/api/me', async (route) => {
    // The success page reads /me once more while the test may already be closing the page
    try {
      const res = await route.fetch()
      const body = await res.json()
      body.data.plan = 'free'
      await route.fulfill({ response: res, json: body })
    } catch {
      await route.abort().catch(() => undefined)
    }
  })
}

test.describe('Checkout do Mercado Pago', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await asFreeUser(page)
    await withCatalog(page)
  })

  test('/planos leva ao checkout do anual, com o Pix de desconto à vista', async ({ page }) => {
    await page.goto('/planos')
    await expect(page.getByTestId('plan-pro-pix')).toHaveText(/Pix R\$\s227,90 \(5% de desconto\)/)
    await page.getByRole('link', { name: 'Assinar anual' }).click()
    await page.waitForURL('**/checkout?plano=anual')
    await expect(page.getByTestId('checkout-price')).toHaveText(/R\$\s239,90/)
    await expect(page.getByRole('tab', { name: 'Cartão' })).toBeVisible()
    await expect(page.getByTestId('checkout-pix-discount')).toHaveText(/Pix R\$\s227,90 \(5% de desconto\)/)
    await expect(page.getByTestId('checkout-seller')).toContainText('Vendido por Fulano de Tal, responsável')
    await expect(page.getByTestId('checkout-seller')).toContainText('BAIGI')
  })

  test('Pix: QR, aviso do recebedor e o plano liberado pelo polling', async ({ page }) => {
    let polls = 0
    await page.route('**/api/checkout/pix', route => route.fulfill({ status: 201, json: { data: payment() } }))
    await page.route(`**/api/checkout/payments/${CHECKOUT_ID}`, (route) => {
      polls++
      const data = polls < 2 ? payment() : payment({ status: 'approved', status_detail: 'accredited', pix: null, plan_active: true, paid_at: '2026-11-08T10:00:00-03:00', plan_expires_at: '2027-11-08T10:00:00-03:00' })
      return route.fulfill({ json: { data } })
    })

    await page.goto('/checkout?plano=anual&metodo=pix')
    await expect(page.getByTestId('checkout-price')).toHaveText(/R\$\s227,90/)
    await page.getByTestId('checkout-pix-start').click()
    await expect(page.getByTestId('pix-receiver')).toContainText('No app do seu banco vai aparecer o nome do responsável pelo Baigi, Fulano de Tal, recebendo pelo Mercado Pago.')
    await expect(page.getByTestId('pix-receiver').getByRole('link')).toHaveAttribute('href', '/quem-faz')
    await expect(page.getByAltText(/QR Code do Pix/)).toBeVisible()
    await expect(page.getByText(/O código expira em/)).toBeVisible()

    await page.waitForURL(`**/checkout/sucesso?checkout=${CHECKOUT_ID}`, { timeout: 15_000 })
    await expect(page.getByText('ativo até 08/11/2027')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir para o Hoje' })).toBeVisible()
  })

  test('Pix expirado oferece um novo código', async ({ page }) => {
    await page.route('**/api/checkout/pix', route => route.fulfill({ status: 201, json: { data: payment() } }))
    await page.route(`**/api/checkout/payments/${CHECKOUT_ID}`, route => route.fulfill({ json: { data: payment({ status: 'expired', status_detail: 'expired', pix: null }) } }))

    await page.goto('/checkout?plano=mensal&metodo=pix')
    await page.getByTestId('checkout-pix-start').click()
    await expect(page.getByText('O código Pix expirou')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Gerar novo Pix' })).toBeVisible()
  })

  test('checkout de outro usuário: "não encontramos"', async ({ page }) => {
    await page.route('**/api/checkout/payments/**', route => route.fulfill({ status: 404, json: { message: 'Recurso não encontrado.' } }))
    await page.goto(`/checkout/sucesso?checkout=${CHECKOUT_ID}`)
    await expect(page.getByRole('heading', { name: 'Não encontramos este pagamento' })).toBeVisible()
  })

  test('cartão: o formulário seguro do Mercado Pago abre no tema do app', async ({ page }) => {
    test.skip(!process.env.MP_PUBLIC_KEY, 'sem MP_PUBLIC_KEY (chave pública do sandbox)')
    await page.goto('/checkout?plano=anual')
    await expect(page.getByTestId('card-brick').locator('iframe').first()).toBeVisible({ timeout: 20_000 })
  })

  // Parcelamento (decisão do dono, 08/11): the Brick's select lists each option with the installment and the total;
  // the chosen count reaches our API. Real Brick and sandbox tokenization; our checkout route is mocked.
  for (const installments of [3, 12]) {
    test(`cartão anual em ${installments}×: parcela e total na opção, e o número de parcelas chega à API`, async ({ page }) => {
      test.skip(!process.env.MP_PUBLIC_KEY, 'sem MP_PUBLIC_KEY (chave pública do sandbox)')
      let sent: any = null
      await page.route('**/api/checkout/card', async (route) => {
        sent = route.request().postDataJSON()
        await route.fulfill({ status: 201, json: { data: payment({ product: 'annual_card', method: 'card', status: 'approved', status_detail: 'accredited', pix: null, installments: sent.installments, amount_cents: 23990, plan_active: true, paid_at: '2026-11-08T10:00:00-03:00', plan_expires_at: '2027-11-08T10:00:00-03:00' }) } })
      })
      await page.route(`**/api/checkout/payments/${CHECKOUT_ID}`, route => route.fulfill({ json: { data: payment({ product: 'annual_card', method: 'card', status: 'approved', pix: null, plan_active: true, plan_expires_at: '2027-11-08T10:00:00-03:00' }) } }))

      await page.goto('/checkout?plano=anual')
      await expect(page.getByTestId('checkout-summary')).toContainText('até 3× sem juros · ou 12× com juros')
      const brick = page.getByTestId('card-brick')
      await expect(brick.locator('iframe').first()).toBeVisible({ timeout: 20_000 })
      await page.frame({ name: 'cardNumber' })!.locator('input:not(.hide)').pressSequentially('5480832801033311')
      await page.frame({ name: 'expirationDate' })!.locator('input:not(.hide)').pressSequentially('1130')
      await page.frame({ name: 'securityCode' })!.locator('input:not(.hide)').pressSequentially('123')
      await brick.locator('input[name="HOLDER_NAME"]').fill('APRO')
      await brick.locator('input[name="DOCUMENT"]').fill('12345678909')

      const select = brick.locator('select').last()
      await expect(select.locator('option', { hasText: /^12x / })).toHaveCount(1, { timeout: 15_000 })
      const options = await select.locator('option').allInnerTexts()
      const option = options.find(o => o.startsWith(`${installments}x `))!
      // Every option says the installment and the total ("12x R$ 24,41 (R$ 292,94)") or that it has no interest
      expect(option).toMatch(/^\d+x R\$\s?[\d.,]+ \((R\$\s?[\d.,]+|[^)]*juros[^)]*)\)$/i)
      await select.selectOption({ label: option })
      await brick.getByRole('button', { name: /Pagar/ }).click()

      await page.waitForURL(`**/checkout/sucesso?checkout=${CHECKOUT_ID}`, { timeout: 20_000 })
      expect(sent.installments).toBe(installments)
      expect(sent.product).toBe('annual')
      expect(sent.token).toBeTruthy()
      expect(sent).not.toHaveProperty('card_number')
    })
  }

  for (const width of [390, 1440]) {
    test(`checkout sem rolagem lateral em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.route('**/api/checkout/pix', route => route.fulfill({ status: 201, json: { data: payment() } }))
      await page.route(`**/api/checkout/payments/${CHECKOUT_ID}`, route => route.fulfill({ json: { data: payment() } }))
      await page.goto('/checkout?plano=anual&metodo=pix')
      await page.getByTestId('checkout-pix-start').click()
      await expect(page.getByAltText(/QR Code do Pix/)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    })
  }
})
