import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { CONSENT_DECIDED } from '../helpers'

/**
 * Entrada do /comecar (prd-entrada-comecar): o visitante chega pelo atalho da bio (/ig), vê a entrada, faz o tour de 7
 * passos só no teclado (o card do passo 1 com o intervalo real), pula, vê os planos do catálogo e chega à grade das
 * áreas. Visitante só: nenhuma conta, nenhuma IA. Precisa do web buildado e da API local (GET /plans).
 */
// After the step's entrance (opacity .5 → 1 in 240 ms) settles: a half-faded frame fails the contrast for nothing
const serious = async (page: Page) => (await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished))), await new AxeBuilder({ page }).analyze()).violations
  .filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
}

test.describe('entrada do /comecar', () => {
  test.use({ storageState: CONSENT_DECIDED })

  test('/ig grava o primeiro toque e abre a entrada', async ({ page }) => {
    await page.goto('/ig')
    await page.waitForURL(/\/comecar\?utm_source=instagram&utm_medium=bio/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('antes de esquecer.')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('baigi-first-touch'))).toContain('"utm_source":"instagram"')
    const touch = JSON.parse((await page.evaluate(() => localStorage.getItem('baigi-first-touch')))!)
    expect(touch).toMatchObject({ utm_source: 'instagram', utm_medium: 'bio', landing: '/comecar' })
  })

  for (const width of [390, 1440]) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`tour inteiro no teclado, ${width} px ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto('/comecar')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('h1')).toHaveCount(1)
        expect(await serious(page)).toEqual([])
        await noSideScroll(page)

        // Hero → step 1, by keyboard
        await page.getByTestId('entry-start').focus()
        await page.keyboard.press('Enter')
        await page.waitForURL(/passo=1/)
        await expect(page.getByRole('heading', { level: 2, name: 'Tente lembrar antes de virar.' })).toBeFocused()
        await page.getByTestId('entry-flip').focus()
        await page.keyboard.press('Enter')
        await expect(page.getByTestId('entry-answer')).toContainText('12 contribuições mensais')
        await page.keyboard.press('2')
        await expect(page.getByTestId('entry-feedback')).toContainText('Então este card só volta daqui a 2 dias.')
        expect(await serious(page)).toEqual([])
        await page.getByTestId('entry-next').click()

        // Steps 2..6 and the browser's Voltar goes one step back
        for (const step of [2, 3, 4, 5, 6]) {
          await page.waitForURL(new RegExp(`passo=${step}`))
          await expect(page.getByTestId('entry-tour')).toBeVisible()
          await noSideScroll(page)
          expect(await serious(page), `passo ${step}`).toEqual([])
          if (step === 5) {
            await expect(page.getByTestId('entry-player-time')).toHaveText(/0:00 \/ 0:19/)
            await expect(page.getByTestId('entry-podcast-plan')).toContainText('episódios por mês')
          }
          if (step < 6) await page.getByTestId('entry-next').click()
        }
        await page.goBack()
        await page.waitForURL(/passo=5/)
        await page.getByTestId('entry-skip').click()
        await page.waitForURL(/passo=7/)
        await expect(page.getByTestId('entry-skip')).toHaveCount(0)
        // Plans only from the catalog: the paid plan's price as GET /plans says
        const plans = await (await page.request.get(`${process.env.E2E_API_URL || 'http://localhost:8037/api'}/plans`)).json()
        const pro = plans.data.plans.find((p: { key: string }) => p.key === 'pro')
        await expect(page.getByTestId('entry-plan-paid-name')).toHaveText(pro.name)
        await expect(page.getByTestId('entry-plan-paid-price')).toHaveText(`R$ ${(pro.prices.monthly.amount_cents / 100).toFixed(2).replace('.', ',')}`)
        if (plans.data.preview) await expect(page.getByTestId('entry-plan-free')).toContainText(plans.data.preview.text)
        expect(await serious(page)).toEqual([])
        await page.getByTestId('entry-plans-areas').click()
        await page.waitForURL('**/comecar/areas')
        await expect(page.getByTestId('area-concurso')).toBeVisible()
      })
    }
  }

  test('Não lembrei volta amanhã; Voltar no passo 1 volta à entrada', async ({ page }) => {
    await page.goto('/comecar?passo=1')
    await expect(page.getByTestId('entry-tour')).toBeVisible()
    await page.getByTestId('entry-flip').click()
    await page.getByTestId('entry-forgot').click()
    await expect(page.getByTestId('entry-feedback')).toContainText('Este card volta amanhã')
    await page.getByTestId('entry-back').click()
    await expect(page.getByTestId('entry-start')).toBeVisible()
  })

  test('movimento reduzido: o passo entra sem animação', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/comecar?passo=2')
    await expect(page.getByTestId('entry-tour')).toBeVisible()
    expect(await page.locator('.ec-enter').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  })
})

test.describe('entrada com o banner de cookies aberto', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test('a barra do passo entra no fluxo e nada fica coberto', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/comecar?passo=1')
    await expect(page.getByTestId('consent-banner')).toBeVisible()
    await expect(page.getByTestId('entry-tour')).toHaveAttribute('data-flow', 'true')
    expect(await page.getByTestId('entry-dock').evaluate(el => getComputedStyle(el).position)).toBe('static')
    await page.getByTestId('consent-reject').click()
    await expect(page.getByTestId('entry-tour')).toHaveAttribute('data-flow', 'false')
    expect(await page.getByTestId('entry-dock').evaluate(el => getComputedStyle(el).position)).toBe('fixed')
  })
})
