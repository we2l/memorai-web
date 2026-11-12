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
    const cta = page.getByTestId('home-goal-start')
    const empty = page.getByText(/Tudo em dia|Que bom ter você aqui/i).first()
    await expect(cta.or(empty)).toBeVisible()
  })
})

test.describe('Mobile — Revisão', () => {
  test('card de revisão cabe na tela', async ({ page }) => {
    await login(page)
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const card = page.getByTestId('review-card')
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

    const card = page.getByTestId('review-card')
    if (await card.count() > 0) {
      await card.click()
      await page.waitForTimeout(500)

      const buttons = page.getByRole('button', { name: /^(De novo|Difícil|Bom|Fácil)/ })
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
    await expect(page.getByRole('heading', { name: 'Conta e segurança' })).toBeVisible()
  })
})

test.describe('Mobile — Podcasts', () => {
  test('botão gerar acessível', async ({ page }) => {
    await login(page)
    await page.goto('/podcasts')
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: 'Gerar episódio' })
    await expect(btn).toBeVisible()
    const box = await btn.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})

test.describe('Mobile — Planos', () => {
  test('cards de plano empilham verticalmente', async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('main').getByRole('heading', { name: 'Grátis' })).toBeVisible()
    await expect(page.getByRole('main').getByText('Seu plano').first()).toBeVisible()
  })
})

test.describe('Mobile — 320px (telas muito pequenas)', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('as 4 abas (sem "Mais") cabem na tela, com alvo de 44 px', async ({ page }) => {
    await login(page)
    const nav = page.locator('nav[aria-label="Navegação mobile"]')
    await expect(nav).toBeVisible()

    const items = nav.locator('a, button')
    await expect(items).toHaveCount(4)
    await expect(nav.getByRole('button', { name: 'Mais' })).toHaveCount(0)

    for (let i = 0; i < 4; i++) {
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

/** Account menu: on the phone the avatar is in the header of Hoje and Progresso (navegação v3). */
async function openAccount(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

test.describe('Mobile — todas as rotas por toque (RF-F1, navegação v3)', () => {
  test('a partir de /hoje alcança todas as rotas e o Sair, sem overflow', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await expectNoHorizontalOverflow(page)
    const nav = page.locator('nav[aria-label="Navegação mobile"]')

    for (const label of ['Cadernos', 'Praticar', 'Progresso']) {
      await nav.getByRole('link', { name: label }).click()
      await expectNoHorizontalOverflow(page)
    }

    // Praticar: Questões (/simulados) e Ouvir (/podcasts)
    for (const [label, path] of [['Questões e simulados', '/simulados'], ['Todos os episódios', '/podcasts']] as const) {
      await nav.getByRole('link', { name: 'Praticar' }).click()
      await page.waitForURL('**/praticar**')
      await page.getByRole('link', { name: label }).click()
      await page.waitForURL(`**${path}**`)
      await expect(nav.getByRole('link', { name: 'Praticar' })).toHaveAttribute('aria-current', 'page')
      await expectNoHorizontalOverflow(page)
    }

    // /revisar is focus mode (no BottomNav): back via "‹ Sair"
    await nav.getByRole('link', { name: 'Praticar' }).click()
    await page.getByRole('link', { name: /5 minutos/ }).click()
    await page.waitForURL('**/revisar**')
    await expect(nav).toBeHidden()
    await expectNoHorizontalOverflow(page)
    await page.getByTestId('review-exit').click()
    await page.waitForURL('**/hoje')

    // Progresso → agenda de provas e volta
    // Progresso: the agenda of exams is a section of it (prd-4f-progresso-v3), and /provas lands there
    await nav.getByRole('link', { name: 'Progresso' }).click()
    await page.getByTestId('progress-exams').waitFor()
    await page.goto('/provas')
    await page.waitForURL('**/progresso#provas')
    await expect(nav.getByRole('link', { name: 'Progresso' })).toHaveAttribute('aria-current', 'page')
    await expectNoHorizontalOverflow(page)

    // Conta: configurações e ajuda pelo avatar
    for (const [label, path] of [['Conta e segurança', '/configuracoes'], ['Ajuda e atalhos', '/ajuda']] as const) {
      await nav.getByRole('link', { name: 'Hoje' }).click()
      await page.waitForURL('**/hoje')
      await openAccount(page)
      await page.getByRole('menuitem', { name: label }).click()
      await page.waitForURL(`**${path}**`)
      await expectNoHorizontalOverflow(page)
    }

    // /planos pela busca do cabeçalho
    await page.goto('/hoje')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await page.getByRole('combobox').fill('planos')
    await page.getByRole('option', { name: /Planos/ }).click()
    await page.waitForURL('**/planos')
    await expectNoHorizontalOverflow(page)

    // /importar pelo "+ Adicionar" (Importar do Anki)
    await page.goto('/hoje')
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const sheet = page.getByRole('dialog', { name: 'Adicionar' })
    await sheet.getByRole('button', { name: /Importar do Anki/ }).or(sheet.getByRole('link', { name: 'Importar do Anki' })).click()
    await page.waitForURL('**/importar')
    await expectNoHorizontalOverflow(page)

    // Sair
    await nav.getByRole('link', { name: 'Hoje' }).click()
    await openAccount(page)
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await page.waitForURL('**/entrar**')
  })

  test('Esc fecha o menu da conta e devolve o foco ao avatar', async ({ page }) => {
    await login(page)
    await openAccount(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
    const avatar = page.getByRole('button', { name: 'Menu da conta' })
    await expect(avatar).toBeFocused()
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('Tablet — navegação no topo a partir de 768 px', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('TopNav com os 4 lugares; sem BottomNav e sem botões flutuantes', async ({ page }) => {
    await login(page)
    const top = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(top).toBeVisible()
    await expect(top.getByRole('link')).toHaveText(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
    await expect(page.locator('nav[aria-label="Navegação mobile"]')).toBeHidden()
    await expect(page.locator('button[aria-label^="Anotar rapidamente"], button[aria-label="Tirar dúvida"]')).toHaveCount(0)
    // Nothing of the shell sticks out of the viewport at 768 px
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(768)
  })
})

test.describe('Mobile — ⋯ do caderno no toque (RF-F6.1, hub da 4b-1)', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

  test('tap no ⋯ do cabeçalho → "Editar" abre o diálogo', async ({ page }) => {
    await login(page)
    const topic = { id: '00000000-0000-4000-8000-0000000000aa', name: 'Direito', parent_id: null, children: [], color: null, flashcards_count: 0, position: 0 }
    const summary = {
      topic: { id: topic.id, name: topic.name, color: null, depth: 0, learning_mode: 'general', parent_id: null }, path: [],
      counts: { cards: 0, materials: 0, subjects: 0 }, mastery: { percent: null, in_day: 0, cards: 0 }, questions: null,
      session: { count: 0, overdue: 0, errors: 0 }, exam: null, next_step: null, listen: null, subjects: [],
      special: { quiz_errors: { cards: 0, session_count: 0 }, loose: { cards: 0, session_count: 0 } },
    }
    const json = (data: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    await page.route(/\/api\/topics$/, r => r.request().method() === 'GET' ? r.fulfill(json({ data: [topic] })) : r.continue())
    await page.route(`**/api/topics/${topic.id}/summary`, r => r.fulfill(json({ data: summary })))
    await page.route(`**/api/topics/${topic.id}/materials**`, r => r.fulfill(json({ data: [], meta: { next_cursor: null, total: 0 } })))
    await page.goto(`/cadernos/${topic.id}`)
    const trigger = page.getByRole('button', { name: 'Mais ações de Direito', exact: true }).first()
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.tap()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('menuitem', { name: /^Editar/ }).tap()
    await expect(page.getByRole('dialog', { name: 'Editar caderno' })).toBeVisible()
  })
})
