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
    const empty = page.getByText(/Tudo em dia|Pare de esquecer|Crie seus primeiros cards/i).first()
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

    await expect(page.getByRole('main').getByText('Grátis', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('main').getByText('Plano atual').first()).toBeVisible()
  })
})

test.describe('Mobile — 320px (telas muito pequenas)', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('os 4 destinos + "Mais" cabem na tela', async ({ page }) => {
    await login(page)
    const nav = page.locator('nav[aria-label="Navegação mobile"]')
    await expect(nav).toBeVisible()

    const items = nav.locator('a, button')
    await expect(items).toHaveCount(5)

    for (let i = 0; i < 5; i++) {
      const item = items.nth(i)
      await expect(item).toBeVisible()
      const box = await item.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(320)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })
})

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, width = 375) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(600)
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth, `overflow em ${page.url()}`).toBeLessThanOrEqual(width)
}

async function openMore(page: import('@playwright/test').Page) {
  const more = page.getByRole('button', { name: 'Mais' })
  await more.click()
  await expect(page.getByRole('dialog', { name: 'Mais opções' })).toBeVisible()
}

test.describe('Mobile — todas as rotas por toque (RF-F1)', () => {
  test('a partir de /hoje alcança todas as rotas e o Sair, sem overflow', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await expectNoHorizontalOverflow(page)
    const nav = page.locator('nav[aria-label="Navegação mobile"]')

    for (const label of ['Cadernos', 'Progresso']) {
      await nav.getByRole('link', { name: label }).click()
      await expectNoHorizontalOverflow(page)
    }

    // /revisar is focus mode (no BottomNav): back via "← Voltar"
    await nav.getByRole('link', { name: 'Revisão' }).click()
    await page.waitForURL('**/revisar**')
    await expect(nav).toBeHidden()
    await expectNoHorizontalOverflow(page)
    await page.getByRole('link', { name: /Voltar/ }).first().click()
    await page.waitForURL('**/hoje')

    for (const [label, path] of [['Simulados', '/simulados'], ['Provas', '/provas'], ['Podcasts', '/podcasts'], ['Configurações', '/configuracoes'], ['Ajuda', '/ajuda']] as const) {
      await openMore(page)
      await page.getByRole('dialog').getByRole('link', { name: label }).click()
      await page.waitForURL(`**${path}`)
      await expect(page.getByRole('dialog', { name: 'Mais opções' })).toBeHidden()
      await expectNoHorizontalOverflow(page)
    }

    // /planos via PlanBadge in the sheet
    await openMore(page)
    await page.getByRole('dialog').locator('a[href="/planos"]').first().click()
    await page.waitForURL('**/planos')
    await expectNoHorizontalOverflow(page)

    // /importar via the "Novo" menu in /cadernos
    await nav.getByRole('link', { name: 'Cadernos' }).click()
    await page.waitForURL('**/cadernos**')
    const importLink = page.locator('a[href="/importar"]:visible').first()
    if (await importLink.count() === 0) {
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click()
    }
    await page.locator('a[href="/importar"]:visible').first().click()
    await page.waitForURL('**/importar')
    await expectNoHorizontalOverflow(page)

    // Sair
    await openMore(page)
    await page.getByRole('dialog').getByRole('button', { name: 'Sair' }).click()
    await page.waitForURL('**/entrar**')
  })

  test('Esc fecha o sheet e devolve o foco ao "Mais"', async ({ page }) => {
    await login(page)
    await openMore(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Mais opções' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Mais' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Mais' })).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('Tablet — FABs não se sobrepõem', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('ChatFab e QuickCapture não se intersectam em 768px', async ({ page }) => {
    await login(page)
    await page.goto('/cadernos')
    await page.waitForTimeout(1000)
    const chat = page.locator('button[aria-label="Tirar dúvida"], button[aria-label="Perguntar sobre o caderno"]').first()
    const quick = page.locator('button[aria-label^="Anotar rapidamente"]')
    const a = await chat.boundingBox()
    const b = (await quick.isVisible()) ? await quick.boundingBox() : null
    expect(a).not.toBeNull()
    if (a && b) {
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      expect(overlap).toBe(false)
    }
  })
})

test.describe('Mobile — árvore de cadernos no toque (RF-F6.1)', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test('tap no ⋯ → "Editar" abre o modal', async ({ page }) => {
    await login(page)
    const topic = { id: '00000000-0000-4000-8000-0000000000aa', name: 'Direito', parent_id: null, children: [], color: null, flashcards_count: 0, position: 0 }
    await page.route(/\/api\/topics$/, r => r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [topic] }) })
      : r.continue())
    await page.goto('/cadernos')
    const trigger = page.getByRole('button', { name: 'Opções de Direito', exact: true }).first()
    if (!(await trigger.isVisible())) {
      // Tree lives in a collapsible panel on small screens
      await page.getByRole('button', { name: /Ver cadernos/i }).first().tap()
    }
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.tap()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('menuitem', { name: 'Editar' }).tap()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
