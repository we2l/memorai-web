import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { CONSENT_DECIDED } from '../helpers'
import { AUDIT_PASSWORD, USERS, provisionUser, sql, tinker } from './support/fixtures'
import fs from 'node:fs'
import path from 'node:path'

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

        // The hero's card (prd-entrada-primeira-dobra RF-1), by keyboard: nothing focused on load, Space on the page
        // scrolls (no global key), Space on the card turns it, 2 rates, Continuar goes to step 2
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
        await expect(page.getByTestId('entry-hero-card')).toBeVisible()
        await page.getByTestId('entry-hero-card').focus()
        await page.keyboard.press('Space')
        await expect(page.getByTestId('entry-answer')).toContainText('12 contribuições mensais')
        await expect(page.getByTestId('entry-hero-card')).toBeFocused()
        await page.keyboard.press('2')
        await expect(page.getByTestId('entry-feedback')).toContainText('Então este card só volta daqui a 2 dias.')
        expect(await serious(page)).toEqual([])
        await page.getByTestId('entry-hero-next').focus()
        await page.keyboard.press('Enter')

        // Steps 2..6 and the browser's Voltar goes one step back
        for (const step of [2, 3, 4, 5, 6]) {
          await page.waitForURL(new RegExp(`passo=${step}`))
          await expect(page.getByTestId('entry-tour')).toBeVisible()
          await noSideScroll(page)
          expect(await serious(page), `passo ${step}`).toEqual([])
          if (step === 5) {
            await expect(page.getByTestId('entry-player-time')).toHaveText(/0:00 \/ 0:50/)
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

/**
 * "Mande o seu edital" (prd-landing-mostrar-produto P3): the box of /comecar sends the edital to the free tool and the
 * reading reaches the caderno after the login. The reading itself (Turnstile + AI) never runs here: a ready reading is
 * created in the local database and only the POST that would start one is answered in the browser; the GET of the
 * result, the login and the apply are real.
 */
test.describe('edital pela entrada do /comecar', () => {
  test.use({ storageState: CONSENT_DECIDED })

  test('caixa → matérias no resultado → Estudar isso no Baigi → Entrar → caderno criado', async ({ page }) => {
    provisionUser('editalEntrada')
    const php = fs.readFileSync(path.join(__dirname, 'support/public-edital.php'), 'utf8').replace(/^<\?php\s*/, '')
    const id = /E2E_PUBLIC_EDITAL_ID=([0-9a-z]{26})/.exec(tinker(php))?.[1]
    expect(id, 'leitura pública criada').toBeTruthy()

    const started: string[] = []
    await page.route(url => url.pathname === '/api/public/editais', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      started.push(route.request().headers()['content-type'] ?? '')
      await route.fulfill({ status: 202, json: { data: { id, status: 'ready', cached: true } } })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/comecar')
    const box = page.getByTestId('entry-edital')
    await box.scrollIntoViewIfNeeded()
    await expect(box.getByRole('heading', { name: 'Já tem o edital? Mande aqui' })).toBeVisible()
    await box.getByRole('tab', { name: 'Colar texto' }).click()
    await box.getByLabel('Conteúdo programático').fill('CONTEÚDO PROGRAMÁTICO. LÍNGUA PORTUGUESA: 1 Crase. 2 Concordância verbal. '.repeat(4))
    await box.getByTestId('edital-send').click()

    await page.waitForURL(new RegExp(`/ferramentas/edital-verticalizado/r/${id}\\?from=comecar`))
    expect(started).toHaveLength(1)
    await expect(page.getByText('Língua Portuguesa').first()).toBeVisible()
    await expect(page.getByText('Direito Constitucional').first()).toBeVisible()

    await page.getByTestId('edital-apply').first().click()
    await page.waitForURL(/\/criar-conta/)
    await page.goto('/entrar')
    await page.locator('#email').fill(USERS.editalEntrada.email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await page.waitForURL(/\/cadernos\/[0-9a-f-]{36}/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText('TRT E2E Entrada')
    const subjects = sql(`select count(*) from topics t join users u on u.id = t.user_id where u.email = '${USERS.editalEntrada.email}' and t.parent_id is not null and t.deleted_at is null`)
    expect(Number(subjects)).toBeGreaterThanOrEqual(2)
    expect(await page.evaluate(() => localStorage.getItem('baigi-edital-intent'))).toBeNull()
    tinker(`App\\Domain\\Topic\\Models\\PublicEditalReading::whereKey('${id}')->delete();`)
  })
})
