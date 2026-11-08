import { test, expect } from '@playwright/test'

/**
 * Oferta vem só de GET /api/plans (RN-01): mudar o catálogo muda a landing sem deploy do front.
 */
test.describe('Catálogo de planos na landing', () => {
  test('preços e linhas seguem a API', async ({ page, request }) => {
    const real = await request.get('http://localhost:8037/api/plans')
    expect(real.ok()).toBeTruthy()
    const catalog = (await real.json()).data
    catalog.features.podcast.pro_benefit = '7 episódios de até 8 min'
    catalog.plans[1].prices.monthly.amount_cents = 3190

    await page.route('**/api/plans', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: catalog }),
    }))

    await page.goto('/#planos')
    const pricing = page.locator('#planos')

    // Landing D (prd-landing-d §5.2): two cards of 5 lines, the monthly price and the annual one of the catalog
    const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
    await expect(pricing.getByTestId('landing-plan-paid-price')).toContainText(brl(3190))
    await expect(pricing.getByTestId('landing-plan-paid-annual')).toContainText(brl(catalog.plans[1].prices.annual.amount_cents))
    await expect(pricing.getByText('7 episódios de até 8 min')).toBeVisible()
    await expect(pricing.getByText(/30 PDFs|10 podcasts/)).toHaveCount(0)
  })

  test('sem catálogo não mostra números, só o erro com "Tentar de novo"', async ({ page }) => {
    await page.route('**/api/plans', route => route.fulfill({ status: 500, body: '' }))

    await page.goto('/#planos')
    const pricing = page.locator('#planos')

    await expect(pricing.getByText('Não deu para carregar os preços agora.')).toBeVisible()
    await expect(pricing.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
    await expect(pricing.getByText(/R\$/)).toHaveCount(0)
  })
})

/**
 * Parcelamento do anual em /planos (decisão do dono, 08/11): até N× sem juros e até M× com juros, do catálogo; o valor
 * mensal só como equivalência, nunca como parcela ou cobrança.
 */
test.describe('Parcelamento do anual em /planos', () => {
  for (const [free, max, line] of [[1, 1, 'à vista no cartão'], [3, 12, 'até 3× sem juros · ou 12× com juros']] as const) {
    test(`${free} sem juros, até ${max}`, async ({ page, request }) => {
      const catalog = (await (await request.get('http://localhost:8037/api/plans')).json()).data
      const annual = catalog.plans.find((p: any) => p.key === 'pro').prices.annual
      Object.assign(annual, { installments_max: max, installments_interest_free: free, card_line: undefined })
      await page.route('**/api/plans', route => route.fulfill({ json: { data: catalog } }))

      await page.goto('/planos')
      const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
      await expect(page.getByTestId('plan-pro-note')).toHaveText(`Equivale a ${brl(annual.monthly_equivalent_cents)} por mês · ${line}`)
      await expect(page.getByText(/cobrado uma vez por ano|\d+x de R\$/)).toHaveCount(0)
    })
  }
})
