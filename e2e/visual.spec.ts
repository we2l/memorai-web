import { test, expect } from '@playwright/test'
import { login } from './helpers'

/**
 * Visual regression tests — captura screenshots das páginas principais.
 * Na primeira execução, gera os snapshots de referência.
 * Nas execuções seguintes, compara pixel a pixel.
 *
 * Atualizar snapshots: npx playwright test e2e/visual.spec.ts --update-snapshots
 */

const pages = [
  { name: 'dashboard', path: '/hoje' },
  { name: 'cadernos', path: '/cadernos' },
  { name: 'progresso', path: '/progresso' },
  { name: 'configuracoes', path: '/configuracoes' },
  { name: 'planos', path: '/planos' },
  { name: 'importar', path: '/importar' },
  { name: 'podcasts', path: '/podcasts' },
]

test.describe('Visual regression — Desktop', () => {
  for (const pg of pages) {
    test(`${pg.name} (desktop)`, async ({ page }) => {
      await login(page)
      await page.goto(pg.path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // animations settle

      await expect(page).toHaveScreenshot(`${pg.name}-desktop.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      })
    })
  }
})

test.describe('Visual regression — Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const pg of pages) {
    test(`${pg.name} (mobile)`, async ({ page }) => {
      await login(page)
      await page.goto(pg.path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      await expect(page).toHaveScreenshot(`${pg.name}-mobile.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
      })
    })
  }
})

test.describe('Visual regression — Revisão', () => {
  test('tela de revisão com card', async ({ page }) => {
    await login(page)
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('revisar.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    })
  })
})

test.describe('Visual regression — Login', () => {
  test('tela de login', async ({ page }) => {
    await page.goto('/entrar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    })
  })

  test('tela de criar conta', async ({ page }) => {
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('criar-conta.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    })
  })
})

test.describe('Visual regression — Provas light/dark (RF-F10.1)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`provas (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
      await login(page)
      await page.goto('/provas')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      // The calendar shows the current month: mask it so the snapshot is stable over time
      await expect(page).toHaveScreenshot(`provas-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: true,
        mask: [page.locator('h2').first()],
      })
    })
  }
})
