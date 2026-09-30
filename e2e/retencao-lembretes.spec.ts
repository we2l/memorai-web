import { execSync } from 'node:child_process'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { sharedPage } from './helpers'

/**
 * prd-retencao-lembretes: Configurações > Lembretes and the public opt-out page.
 * Needs the local stack (docker baigi-app on :8037) and `node .output/server` on :3000.
 */
const E2E_EMAIL = process.env.E2E_EMAIL || 'verified@e2e.test'

/** Signed opt-out URL straight from the API (same link the e-mail footer carries). */
function unsubscribeUrl(): string | null {
  try {
    const php = `echo app(App\\Domain\\User\\Services\\Contracts\\EmailPreferenceServiceInterface::class)->unsubscribeUrl(App\\Domain\\User\\Models\\User::where('email','${E2E_EMAIL}')->firstOrFail());`
    const out = execSync(`docker exec baigi-app php artisan tinker --execute "${php.replace(/"/g, '\\"')}"`, { encoding: 'utf8' })
    return out.trim().split('\n').pop()?.trim() || null
  } catch {
    return null
  }
}

test.describe('Lembretes (público)', () => {
  test('link inválido não chama nada e orienta para Configurações', async ({ page }) => {
    await page.goto('/lembretes/desativado?u=' + encodeURIComponent('https://evil.test/email/unsubscribe/x'))
    await expect(page.getByRole('heading', { name: 'Link inválido' })).toBeVisible()
  })

  test('opt-out pelo link assinado e reativação, sem login', async ({ page }) => {
    const url = unsubscribeUrl()
    test.skip(!url, 'sem acesso ao container baigi-app')

    await page.goto('/lembretes/desativado?u=' + encodeURIComponent(url!))
    await expect(page.getByRole('heading', { name: 'Lembretes desativados' })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([])

    await page.getByRole('button', { name: 'Reativar lembretes' }).click()
    await expect(page.getByText(/Pronto, lembretes reativados às \d+h\./)).toBeVisible()
  })
})

test.describe('Configurações > Lembretes', () => {
  let page: import('@playwright/test').Page

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser, { viewport: { width: 375, height: 800 } })
  })
  test.afterAll(async () => { await page.context().close() })

  test('switch acessível persiste e desabilita o horário', async () => {
    await page.goto('/configuracoes#lembretes')
    const toggle = page.getByRole('switch', { name: /E-mails de estudo/ })
    await expect(toggle).toBeVisible()
    const initial = await toggle.getAttribute('aria-checked')

    await toggle.click()
    const flipped = initial === 'true' ? 'false' : 'true'
    await expect(toggle).toHaveAttribute('aria-checked', flipped)
    if (flipped === 'false') await expect(page.locator('#reminder-hour')).toBeDisabled()

    await page.reload()
    await expect(page.getByRole('switch', { name: /E-mails de estudo/ })).toHaveAttribute('aria-checked', flipped)

    // Leave the account as it was
    await page.getByRole('switch', { name: /E-mails de estudo/ }).click()
    await expect(page.getByRole('switch', { name: /E-mails de estudo/ })).toHaveAttribute('aria-checked', initial!)
  })
})
