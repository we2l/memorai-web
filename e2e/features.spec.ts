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

    await page.getByRole('button', { name: /Novo caderno|Criar caderno/ }).first().click()

    const dialog = page.getByRole('dialog', { name: 'Novo caderno' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill(TEST_NOTEBOOK)
    await dialog.getByRole('button', { name: 'Criar' }).click()

    // The new caderno opens its hub (/cadernos/{id})
    await expect(page.getByRole('heading', { level: 1, name: TEST_NOTEBOOK })).toBeVisible({ timeout: 5000 })
  })

  test('2. Selecionar caderno e ver hub', async () => {
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('notebook-list').getByRole('link', { name: new RegExp(TEST_NOTEBOOK) }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: TEST_NOTEBOOK })).toBeVisible()
  })

  test('3. Criar card manualmente', async () => {
    // Caderno vazio: "Criar um card à mão" abre a biblioteca de cards com o formulário (a antiga aba Cards)
    await page.getByTestId('empty-card').click()

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

    const reviewLink = page.getByTestId('plan-step-review').getByRole('link', { name: 'Começar' })
    const hasDue = await reviewLink.count() > 0

    if (hasDue) {
      await reviewLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/revisar/)
      await page.waitForTimeout(2000)

      const hasCard = await page.getByTestId('review-card').count() > 0
      const finished = await page.getByTestId('review-all-done').or(page.getByTestId('review-session-end')).count() > 0
      expect(hasCard || finished).toBeTruthy()
    }
  })

  test('5. Revisar card (se disponível)', async () => {
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const hasCard = await page.getByTestId('review-card').count() > 0
    if (!hasCard) {
      test.skip()
      return
    }

    // Flip card
    await page.getByTestId('review-card').click()
    await page.waitForTimeout(500)

    // Rating
    const goodBtn = page.getByRole('button', { name: /^Bom/ })
    if (await goodBtn.count() > 0) {
      await goodBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('6. Deletar caderno de teste', async () => {
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')

    // ⋯ do cabeçalho do hub → Excluir → confirmar: vai para a lixeira na hora e a tela volta à lista
    await page.getByTestId('notebook-list').getByRole('link', { name: new RegExp(TEST_NOTEBOOK) }).click()
    await page.getByRole('button', { name: `Mais ações de ${TEST_NOTEBOOK}`, exact: true }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const deleted = page.waitForRequest(r => r.method() === 'DELETE' && r.url().includes('/api/topics/'), { timeout: 20_000 })
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mandar para a lixeira' }).click()
    await deleted
    await expect(page).toHaveURL(/\/cadernos$/)
  })
})

test.describe('Revisão relâmpago (blitz)', () => {
  test('carrega modo blitz com badge ou timer', async ({ page }) => {
    await login(page)
    await page.goto('/revisar?mode=blitz')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Linha de contexto do Relâmpago, timer com aria-label ou "Tudo em dia"
    const blitzBadge = page.getByTestId('review-context').filter({ hasText: 'Relâmpago' })
    const timer = page.locator('[aria-label*="restantes"]')
    const noCards = page.getByTestId('review-all-done').or(page.getByTestId('review-no-cards'))

    const visible = await blitzBadge.count() > 0 || await timer.count() > 0 || await noCards.count() > 0
    expect(visible).toBeTruthy()
  })
})

test.describe('Configurações de estudo', () => {
  test('toggle tema escuro/claro funciona', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')

    // Sistema, Claro e Escuro (prd-ds-v3-fundacao RF-1.4, prd-4g RF-F1); a escolha vira o tema da página
    await expect(page.getByRole('radio', { name: 'Sistema' })).toBeVisible()
    await page.getByRole('radio', { name: 'Escuro' }).check()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await page.getByRole('radio', { name: 'Claro' }).check()
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  })

  test('configuração de sessão de estudo visível', async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')

    // prd-4g RF-F1: the goal, the reminder, the limits of the day, retention and the error diary in one section
    await expect(page.getByRole('heading', { name: 'Estudo e lembretes', exact: true })).toBeVisible()
    await expect(page.getByTestId('daily-goal')).toBeVisible()
    await expect(page.getByLabel('Cards novos por dia')).toBeVisible()
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

    await page.getByRole('button', { name: 'Gerar episódio' }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('dialog', { name: 'Gerar episódio' })).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Progresso e estatísticas', () => {
  test('exibe domínio geral e retenção', async ({ page }) => {
    await login(page)
    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // A user with cards sees the summary; one without, the single block with the preview (no zeros)
    const summary = page.getByTestId('progress-summary')
    await expect(summary.or(page.getByTestId('progress-new'))).toBeVisible()
    if (await summary.isVisible()) {
      await expect(summary).toContainText('de domínio')
      await expect(summary).toContainText(/lembrou ao revisar|Revise para ver quanto lembra/)
      await expect(summary).toContainText('de sequência')
    }
  })

  test('exibe estados de cards', async ({ page }) => {
    await login(page)
    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // The card states left for the performance table and the history (prd-4f-progresso-v3)
    await expect(page.getByTestId('progress-performance').or(page.getByTestId('progress-new'))).toBeVisible()
    if (await page.getByTestId('progress-new').isVisible()) return
    await expect(page.getByTestId('progress-history').getByRole('grid')).toBeVisible()
  })
})

test.describe('Planos e pagamento', () => {
  test('usuário Pro vê plano atual marcado', async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Seu plano')).toBeVisible()
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

test.describe.serial('Cadernos: URL e exclusão com Desfazer (RF-F6.2/F6.4, rotas da 4b-1)', () => {
  let page: Page
  const A = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Caderno A', parent_id: null, children: [], color: null, notes_count: 1, flashcards_count: 2, position: 0 }
  const B = { id: '00000000-0000-4000-8000-0000000000b2', name: 'Caderno B', parent_id: null, children: [], color: null, notes_count: 0, flashcards_count: 0, position: 1 }
  const summaryOf = (t: typeof A) => ({
    topic: { id: t.id, name: t.name, color: null, depth: 0, learning_mode: 'general', parent_id: null }, path: [],
    counts: { cards: t.flashcards_count, materials: t.notes_count, subjects: 0 }, mastery: { percent: 0, in_day: 0, cards: t.flashcards_count },
    questions: null, session: { count: t.flashcards_count, overdue: 0, errors: 0 }, can_quiz: { ok: true }, can_podcast: { ok: true },
    exam: null, next_step: null, listen: null, subjects: [], special: { quiz_errors: { cards: 0, session_count: 0 }, loose: { cards: 0, session_count: 0 } },
  })
  let deletes = 0
  let restores = 0

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)
    const json = (data: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    await page.route(/\/api\/topics$/, r => r.request().method() === 'GET' ? r.fulfill(json({ data: [A, B] })) : r.continue())
    await page.route(/\/api\/topics\/progress$/, r => r.fulfill(json({ data: [A, B].map(t => ({ ...t, progress: 0, review_count: 0, session_count: t.flashcards_count })) })))
    await page.route(/\/api\/topics\/[0-9a-f-]+\/summary$/, r => r.fulfill(json({ data: summaryOf(r.request().url().includes(B.id) ? B : A) })))
    await page.route(/\/api\/topics\/[0-9a-f-]+\/materials.*/, r => r.fulfill(json({ data: [], meta: { next_cursor: null, total: 0 } })))
    await page.route(/\/api\/topics\/[0-9a-f-]+$/, r => {
      if (r.request().method() === 'DELETE') { deletes++; return r.fulfill(json({ data: { trash_batch_id: 'lote-b', purge_at: '2026-12-02T03:00:00Z', counts: {} } })) }
      return r.fulfill(json({ data: A }))
    })
    await page.route(/\/api\/topics\/[0-9a-f-]+\/delete-preview$/, r => r.fulfill(json({ data: { subjects: 0, materials: 0, cards: 0, reviews: 0, quizzes: 0, podcasts: 0 } })))
    await page.route(/\/api\/trash$/, r => r.fulfill(json({ data: [] })))
    await page.route(/\/api\/trash\/lote-b\/restore$/, (r) => { restores++; return r.fulfill(json({ data: { id: 'lote-b' } })) })
  })

  test.afterAll(async () => { await page.close() })

  test('URL antiga → hub; trocar de caderno pelo caminho → voltar', async () => {
    await page.goto(`/cadernos?topic=${A.id}`)
    await expect(page).toHaveURL(new RegExp(`/cadernos/${A.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Caderno A' })).toBeVisible()
    await page.getByRole('button', { name: 'Trocar de caderno' }).click()
    await page.getByRole('menuitem', { name: 'Caderno B' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${B.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Caderno B' })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${A.id}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Caderno A' })).toBeVisible()
  })

  test('excluir → Desfazer: o DELETE sai na hora e o lote é restaurado', async () => {
    await page.goto(`/cadernos/${B.id}`)
    await page.getByRole('button', { name: 'Mais ações de Caderno B', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog.getByRole('heading', { name: 'Mandar “Caderno B” para a lixeira?' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Mandar para a lixeira' }).click()
    await expect(page).toHaveURL(/\/cadernos$/)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Caderno B' })).toBeVisible()
    expect(deletes).toBe(1)
    expect(restores).toBe(1)
  })
})
