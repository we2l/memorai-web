import { test, expect } from '@playwright/test'

/**
 * Oferta vem só de GET /api/plans (RN-01): mudar o catálogo muda a landing sem deploy do front.
 */
test.describe('Catálogo de planos na landing', () => {
  test('preços e limites seguem a API', async ({ page, request }) => {
    const real = await request.get('http://localhost:8037/api/plans')
    expect(real.ok()).toBeTruthy()
    const catalog = (await real.json()).data
    catalog.plans[1].limits.podcast = 7

    await page.route('**/api/plans', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: catalog }),
    }))

    await page.goto('/#planos')
    const pricing = page.locator('#planos')

    await expect(pricing.getByText('R$ 29,90')).toBeVisible()
    await expect(pricing.getByText('Podcasts: 7 por mês (até 15 min)')).toBeVisible()
    await expect(pricing.getByText('Gerações de cards com IA: 10 por mês')).toBeVisible()
    await expect(pricing.getByText(/30 PDFs|10 podcasts/)).toHaveCount(0)
  })

  test('sem catálogo não mostra números, só o link para os detalhes', async ({ page }) => {
    await page.route('**/api/plans', route => route.fulfill({ status: 500, body: '' }))

    await page.goto('/#planos')
    const pricing = page.locator('#planos')

    await expect(pricing.getByRole('link', { name: 'Ver detalhes dos planos' })).toBeVisible()
    await expect(pricing.getByText(/R\$/)).toHaveCount(0)
  })
})

/**
 * Anual sem parcelamento falso (prd-custo-abuso-p0 RF-7): "Nx de" só quando GET /api/plans
 * anuncia installments_max > 1; com 1 (padrão), "à vista no cartão".
 */
test.describe('Parcelamento do anual em /planos', () => {
  for (const installments of [1, 12]) {
    test(`installments_max=${installments}`, async ({ page, request }) => {
      const catalog = (await (await request.get('http://localhost:8037/api/plans')).json()).data
      const annual = catalog.plans.find((p: any) => p.key === 'pro').prices.annual
      annual.installments_max = installments
      await page.route('**/api/plans', route => route.fulfill({ json: { data: catalog } }))

      await page.goto('/planos')
      const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
      if (installments > 1) {
        await expect(page.getByText(`${brl(annual.amount_cents)} no Pix ou 12x de ${brl(Math.round(annual.amount_cents / 12))} sem juros no cartão`)).toBeVisible()
      } else {
        await expect(page.getByText(`${brl(annual.amount_cents)} no Pix ou à vista no cartão`)).toBeVisible()
        await expect(page.getByText(/\d+x de/)).toHaveCount(0)
      }
    })
  }
})

/** Oferta de /planos só do catálogo (prd-4h-landing-v3 RF-F11, RF-F12): destaques, linhas e tabela seguem o mock. */
test.describe('Catálogo em /planos', () => {
  test('destaques, linhas e tabela mudam com o catálogo', async ({ page, request }) => {
    const catalog = (await (await request.get('http://localhost:8037/api/plans')).json()).data
    catalog.plans[0].highlights = ['Frase do catálogo para o Grátis']
    catalog.plans[1].highlights = ['Frase do catálogo para o Pro']
    catalog.plans[1].limits.podcast = 7
    await page.route('**/api/plans', route => route.fulfill({ json: { data: catalog } }))

    await page.goto('/planos')
    await expect(page.getByTestId('plan-free').getByText('Frase do catálogo para o Grátis')).toBeVisible()
    await expect(page.getByTestId('plan-pro').getByText('Frase do catálogo para o Pro')).toBeVisible()
    await expect(page.getByTestId('plan-pro').getByText('Podcasts: 7 por mês (até 15 min)')).toBeVisible()
    await expect(page.getByTestId('compare-podcast').getByRole('cell').nth(1)).toContainText('7 por mês')
  })
})
