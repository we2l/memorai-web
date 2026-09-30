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
