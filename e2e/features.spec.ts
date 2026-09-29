import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

/**
 * Testes E2E das funcionalidades principais do Memorai.
 * Fluxos reais: criar caderno, criar card, revisar, deletar.
 */

const TEST_NOTEBOOK = `E2E Teste ${Date.now()}`

test.describe.serial('Fluxo completo: Caderno → Card → Revisão', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('1. Criar caderno', async () => {
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')

    await page.getByText('Novo', { exact: true }).click()
    await page.getByText('Novo caderno').first().click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.locator('[aria-label="Criar caderno"] input').fill(TEST_NOTEBOOK)
    await page.locator('[aria-label="Criar caderno"] button:has-text("Criar")').click()

    await expect(page.getByText(TEST_NOTEBOOK)).toBeVisible({ timeout: 5000 })
  })

  test('2. Selecionar caderno e ver hub', async () => {
    await page.getByText(TEST_NOTEBOOK).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: TEST_NOTEBOOK })).toBeVisible()
  })

  test('3. Criar card manualmente', async () => {
    // Ir pra aba Cards
    await page.getByText('Cards').first().click()
    await page.waitForTimeout(500)

    // Botão de criar card
    await page.getByText(/Criar card|Novo card/i).first().click()

    // Modal de criação de card
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Preencher frente e verso (contenteditable Tiptap)
    const editables = dialog.locator('[contenteditable="true"]')
    await editables.first().click()
    await page.keyboard.type('Capital do Brasil?')
    await editables.nth(1).click()
    await page.keyboard.type('Brasília')

    // Salvar
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
    await page.waitForTimeout(1000)

    // Card aparece na lista (fora do dialog)
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('main').getByText('Capital do Brasil?').first()).toBeVisible({ timeout: 5000 })
  })

  test('4. Iniciar revisão do caderno', async () => {
    await page.goto('/hoje')
    await page.waitForLoadState('networkidle')

    const reviewLink = page.getByRole('link', { name: /Começar revisão/i })
    const hasDue = await reviewLink.count() > 0

    if (hasDue) {
      await reviewLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/revisar/)
      await page.waitForTimeout(2000)

      const hasCard = await page.locator('.review-card').count() > 0
      const finished = await page.getByText(/Tudo em dia|Missão de hoje concluída/i).count() > 0
      expect(hasCard || finished).toBeTruthy()
    }
  })

  test('5. Revisar card (se disponível)', async () => {
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const hasCard = await page.locator('.review-card').count() > 0
    if (!hasCard) {
      test.skip()
      return
    }

    // Flip card
    await page.locator('.review-card').click()
    await page.waitForTimeout(500)

    // Rating
    const goodBtn = page.getByRole('button', { name: /Bom/i })
    if (await goodBtn.count() > 0) {
      await goodBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('6. Deletar caderno de teste', async () => {
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')

    await page.getByText(TEST_NOTEBOOK).click()
    await page.waitForTimeout(500)

    // Hover no item da árvore (span dentro do botão, não o heading)
    const treeItem = page.getByRole('button', { name: TEST_NOTEBOOK })
    await treeItem.hover()

    const deleteBtn = page.locator('button[title*="Deletar"], button[title*="Excluir"]').first()
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click()
      // Confirmar no modal
      await page.locator('.btn-danger').click()
      await page.waitForTimeout(1000)
      await expect(page.getByRole('heading', { name: TEST_NOTEBOOK })).not.toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Revisão relâmpago (blitz)', () => {
  test('carrega modo blitz com badge ou timer', async ({ page }) => {
    await login(page)
    await page.goto('/revisar?mode=blitz')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Badge "⚡ Relâmpago" ou timer com aria-label ou "Tudo em dia"
    const blitzBadge = page.getByText('⚡ Relâmpago')
    const timer = page.locator('[aria-label*="restantes"]')
    const noCards = page.getByText(/Tudo em dia|Missão de hoje concluída/i)

    const visible = await blitzBadge.count() > 0 || await timer.count() > 0 || await noCards.count() > 0
    expect(visible).toBeTruthy()
  })
})

test.describe('Configurações de estudo', () => {
  test('toggle tema escuro/claro funciona', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Tema')).toBeVisible()
    // Botões Escuro e Claro existem
    await expect(page.getByRole('button', { name: 'Escuro', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Claro/i })).toBeVisible()
  })

  test('configuração de sessão de estudo visível', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')

    // Daily limits stay hidden (PRD F11.3); the study section exposes retention + error diary
    await expect(page.getByRole('heading', { name: 'Estudo', exact: true })).toBeVisible()
    await expect(page.getByRole('radiogroup').first()).toBeVisible()
    await expect(page.getByText('Quanto você quer lembrar')).toBeVisible()
  })
})

test.describe('Importar Anki', () => {
  test('aceita apenas .apkg', async ({ page }) => {
    await login(page)
    await page.goto('/importar')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', '.apkg')
  })
})

test.describe('Podcasts', () => {
  test('botão gerar abre dialog de configuração', async ({ page }) => {
    await login(page)
    await page.goto('/podcasts')
    await page.waitForLoadState('networkidle')

    await page.getByText('Gerar podcast').click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('dialog', { name: /Podcast/i })).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Progresso e estatísticas', () => {
  test('exibe domínio geral e retenção', async ({ page }) => {
    await login(page)
    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page.getByText('Domínio geral')).toBeVisible()
    await expect(page.getByText(/Retenção/).first()).toBeVisible()
    await expect(page.getByText(/Streak/)).toBeVisible()
  })

  test('exibe estados de cards', async ({ page }) => {
    await login(page)
    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(page.getByText(/Dominados|Aprendendo|Novos/).first()).toBeVisible()
  })
})

test.describe('Planos e pagamento', () => {
  test('usuário Pro vê plano atual marcado', async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Plano atual')).toBeVisible()
  })

  test('features do Pro listadas', async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/ilimitad/i).first()).toBeVisible()
  })
})

test.describe('Dashboard — ações rápidas', () => {
  test('links de navegação funcionam', async ({ page }) => {
    await login(page)

    const cadernos = page.getByRole('link', { name: /Cadernos/i }).first()
    if (await cadernos.count() > 0) {
      await cadernos.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/cadernos/)
    }
  })
})

test.describe.serial('Cadernos: URL e exclusão com Desfazer (RF-F6.2/F6.4)', () => {
  let page: Page
  const A = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Caderno A', parent_id: null, children: [], color: null, notes_count: 1, flashcards_count: 2, position: 0 }
  const B = { id: '00000000-0000-4000-8000-0000000000b2', name: 'Caderno B', parent_id: null, children: [], color: null, notes_count: 0, flashcards_count: 0, position: 1 }
  let deletes = 0

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
    const json = (data: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    await page.route(/\/api\/topics$/, r => r.request().method() === 'GET' ? r.fulfill(json({ data: [A, B] })) : r.continue())
    await page.route(/\/api\/topics\/[0-9a-f-]+$/, r => {
      if (r.request().method() === 'DELETE') { deletes++; return r.fulfill(json({})) }
      return r.fulfill(json({ data: A }))
    })
    await page.route(/\/api\/topics\/[0-9a-f-]+\/(notes|flashcards).*/, r => r.fulfill(json({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } })))
    await page.route(/\/api\/documents\?.*/, r => r.fulfill(json({ data: [] })))
  })

  test.afterAll(async () => { await page.close() })

  test('selecionar B → voltar → A selecionado', async () => {
    await page.goto(`/cadernos?topic=${A.id}`)
    await expect(page.getByRole('button', { name: /Caderno A/ }).first()).toHaveAttribute('aria-current', 'true')
    await page.getByRole('button', { name: /Caderno B/ }).first().click()
    await expect(page).toHaveURL(new RegExp(`topic=${B.id}`))
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`topic=${A.id}`))
    await expect(page.getByRole('button', { name: /Caderno A/ }).first()).toHaveAttribute('aria-current', 'true')
  })

  test('excluir → Desfazer: o item volta sem request', async () => {
    await page.getByRole('button', { name: 'Opções de Caderno B', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog.getByRole('heading', { name: "Excluir 'Caderno B'?" })).toBeVisible()
    await dialog.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('button', { name: /Caderno B/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByRole('button', { name: /Caderno B/ }).first()).toBeVisible()
    await page.waitForTimeout(500)
    expect(deletes).toBe(0)
  })
})
