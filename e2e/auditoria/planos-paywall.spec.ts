import { test, expect, gotoApp, apiCall, uid, doc, realGate, sql, USERS, catalogProName } from './support/fixtures'
import type { Page } from '@playwright/test'

import { openCheckout } from './support/public-pages'

/**
 * Planos → checkout (o checkout transparente do Mercado Pago dentro do Baigi, /checkout?plano=…; o pagamento em si fica
 * em e2e/checkout-mercadopago.spec.ts), Free com cota esgotada → paywall, não verificado tentando IA. A IA nunca roda: os
 * gates reais (402/403) respondem antes, e `realGate` só deixa a chamada passar depois de checar a pré-condição no banco.
 */

// "Assinar anual" or "Assinar <plano pago>" (the name of the catalog): a link to the checkout of the Baigi
const subscribeButton = (page: Page) => page.getByRole('main').getByTestId('plan-subscribe')

test.describe('Planos → checkout (Free)', () => {
  test.use({ auditUser: 'free' })

  test('Assinar abre o checkout do Mercado Pago no Baigi (anual e mensal)', async ({ page }) => {
    await openCheckout(page)
    await gotoApp(page, '/planos')
    await expect(page.getByRole('heading', { name: 'Planos', level: 1 })).toBeVisible()
    await expect(subscribeButton(page)).toHaveText('Assinar anual')
    await subscribeButton(page).click()
    await page.waitForURL('**/checkout?plano=anual')

    await gotoApp(page, '/planos')
    await page.getByRole('main').getByRole('radio', { name: /Mensal/i }).click()
    await expect(subscribeButton(page)).toHaveText(`Assinar ${await catalogProName()}`)
    await subscribeButton(page).click()
    await page.waitForURL(/\/checkout\?plano=mensal/)
  })

  test('checkout fechado ("Assinatura em breve"): os preços ficam e o botão de pagar não aparece', async ({ page }) => {
    await page.route('**/api/plans', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.checkout = { ...(body.data.checkout ?? {}), available: false }
      await route.fulfill({ response: res, json: body })
    })
    await gotoApp(page, '/planos')
    await expect(page.getByTestId('plan-pro-price')).toBeVisible()
    await expect(subscribeButton(page)).toHaveCount(0)
    await expect(page.getByTestId('plan-checkout-soon-note')).toBeVisible()
  })
})

test.describe('Planos — link direto', () => {
  test.use({ auditUser: 'free' })

  test('/planos?ciclo=mensal aberto direto (link/e-mail) mostra o mensal', async ({ page }) => {
    await openCheckout(page)
    await page.goto('/planos?ciclo=mensal')
    await page.waitForLoadState('networkidle')
    // Prerendered: the query only comes back after hydration, and the page follows router.currentRoute
    await expect(subscribeButton(page)).toHaveText(`Assinar ${await catalogProName()}`)
  })
})

test.describe('Paywall: Free com a prévia da IA esgotada', () => {
  test.use({ auditUser: 'quota' })

  test('"Gerar cards" recebe 402 do servidor e abre o modal de limite → Ver planos', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Cota ${uid()}` })
    await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Material', content: doc('Fotossíntese e clorofila.') })
    // The Free's preview of the AI is spent (prd-uso-justo §9, provision quota_exhausted): the server answers 402
    const noAi = () => sql(`select plan = 'free' from users where email='${USERS.quota.email}'`) === 't'
    expect(noAi(), 'pré-condição: Grátis com a prévia esgotada').toBe(true)
    const gate = await realGate(page, /\/api\/ai\/generate-cards$/, 'quota', noAi)

    // The hub of a caderno with material and no cards: "Gerar cards de…" opens the material and its workshop
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('scope-generate').click()
    const modal = page.getByRole('dialog', { name: /^Você usou a prévia grátis de / })
    await expect(modal).toBeVisible()
    expect(gate.map(g => g.status)).toEqual([402])
    expect(gate[0].body.code).toBe('feature_limit_reached')
    expect(gate[0].body.lifetime).toBe(true)
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
  // O pagamento exige o e-mail verificado na API (rotas de checkout no grupo verified.api, testadas no PHPUnit)

})
