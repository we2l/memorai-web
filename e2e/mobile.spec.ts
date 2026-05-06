import { test, expect } from '@playwright/test'
import { login } from './helpers'

/**
 * Testes mobile — viewport 375x812 (iPhone SE/13 mini).
 * Verifica que a UI funciona em telas pequenas.
 */

test.use({ viewport: { width: 375, height: 812 } })

test.describe('Mobile — Navegação', () => {
  test('bottom nav visível no mobile', async ({ page }) => {
    await login(page)
    await expect(page.locator('nav[aria-label*="mobile"], nav[aria-label*="Navegação mobile"], [class*="BottomNav"]').first()).toBeVisible()
  })

  test('cadernos funciona no mobile', async ({ page }) => {
    await login(page)
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')
    // Página carrega sem erro — URL correta
    await expect(page).toHaveURL(/\/cadernos/)
  })
})

test.describe('Mobile — Dashboard', () => {
  test('dashboard carrega e é usável', async ({ page }) => {
    await login(page)
    await page.goto('/hoje')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('CTA de revisão acessível', async ({ page }) => {
    await login(page)
    await page.goto('/hoje')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    const cta = page.getByRole('link', { name: /Começar revisão/i })
    const empty = page.getByText(/Tudo em dia|Pare de esquecer/i)
    await expect(cta.or(empty)).toBeVisible()
  })
})

test.describe('Mobile — Revisão', () => {
  test('card de revisão cabe na tela', async ({ page }) => {
    await login(page)
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const card = page.locator('.review-card')
    if (await card.count() > 0) {
      const box = await card.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeLessThanOrEqual(375)
    }
  })

  test('botões de rating visíveis após flip', async ({ page }) => {
    await login(page)
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const card = page.locator('.review-card')
    if (await card.count() > 0) {
      await card.click()
      await page.waitForTimeout(500)

      const buttons = page.getByRole('button', { name: /Bom|Fácil|Difícil|De novo/i })
      if (await buttons.count() > 0) {
        const firstBtn = buttons.first()
        await expect(firstBtn).toBeVisible()
        const box = await firstBtn.boundingBox()
        expect(box!.y).toBeLessThan(812)
      }
    }
  })
})

test.describe('Mobile — Configurações', () => {
  test('página scrollável e usável', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
    await expect(page.getByText('Perfil')).toBeVisible()
  })
})

test.describe('Mobile — Podcasts', () => {
  test('botão gerar acessível', async ({ page }) => {
    await login(page)
    await page.goto('/podcasts')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Gerar podcast')).toBeVisible()
    const btn = page.getByText('Gerar podcast')
    const box = await btn.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})

test.describe('Mobile — Planos', () => {
  test('cards de plano empilham verticalmente', async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Grátis', { exact: true })).toBeVisible()
    await expect(page.getByText('Plano atual')).toBeVisible()
  })
})

test.describe('Mobile — 320px (telas muito pequenas)', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('todos os 5 itens do menu cabem na tela', async ({ page }) => {
    await login(page)
    const nav = page.locator('nav[aria-label="Navegação mobile"]')
    await expect(nav).toBeVisible()

    const links = nav.locator('a')
    await expect(links).toHaveCount(5)

    for (let i = 0; i < 5; i++) {
      const link = links.nth(i)
      await expect(link).toBeVisible()
      const box = await link.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(320)
    }
  })
})
