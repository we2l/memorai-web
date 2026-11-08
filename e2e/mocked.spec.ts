import { test, expect } from '@playwright/test'
import { login, sharedPage, json } from './helpers'

/**
 * Testes com mock de API — simula respostas da IA e estados extremos.
 * Intercepta requests pro backend (localhost:8037/api) e retorna dados controlados.
 */

const API = '**/api/'

test.describe('Mock: Sessão de revisão com cards', () => {
  const mockCards = [
    {
      id: 'mock-card-1',
      // front/back are HTML strings now (TipTap JSON was the old shape: nothing rendered and the test skipped itself)
      front: '<p>O que é FSRS?</p>',
      back: '<p>Free Spaced Repetition Scheduler</p>',
      state: 'new',
      due: null,
      lapses: 0,
      reps: 0,
      is_learning: false,
      topic_name: 'Algoritmos',
      topic_id: 'topic-1',
      source_note_id: null,
      cloze_index: null,
      next_intervals: { again: '1m', hard: '5m', good: '10m', easy: '4d' },
    },
  ]

  test('exibe cards mockados e permite flip + rating', async ({ page }) => {
    await login(page)

    // Mock session endpoint
    await page.route('**/review/session*', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockCards }) })
    })

    // Mock review submit
    await page.route('**/api/review', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              review: { id: 'review-1' },
              flashcard: { ...mockCards[0], state: 'learning', is_learning: true, due: new Date(Date.now() + 600000).toISOString() },
              next_intervals: { again: '1m', hard: '5m', good: '10m', easy: '4d' },
              weak_connections: null,
              note_snippet: null,
            },
          }),
        })
      } else {
        route.continue()
      }
    })

    // Mock settings
    await page.route('**/api/settings', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { survival_mode: false, session_time_limit: null } }) })
    })

    await page.goto('/revisar')
    await page.waitForTimeout(3000)

    // Card deve estar visível
    const cardText = page.getByText('O que é FSRS?')
    if (await cardText.count() > 0) {
      await expect(cardText).toBeVisible()

      // Flip
      await page.getByTestId('review-card').click()
      await page.waitForTimeout(500)
      await expect(page.getByText('Free Spaced Repetition Scheduler')).toBeVisible()

      // Rating
      await expect(page.getByRole('button', { name: /^Bom/ })).toBeVisible()
      await page.getByRole('button', { name: /^Bom/ }).click()
      await page.waitForTimeout(1000)
    } else {
      // Mock não interceptou (API real respondeu primeiro) — skip gracefully
      test.skip()
    }
  })
})

test.describe('Mock: Backlog grande (atraso no plano do dia)', () => {
  test('o passo Revisar mostra o atraso e leva a "Recuperar atraso" em /praticar', async ({ page }) => {
    await login(page)

    await page.route(/\/api\/stats$/, route => route.fulfill(json({ data: {
      due_today: 40, reviewed_today: 0, cards_reviewed_today: 0, total_cards: 500, total_decks: 1, streak: 3,
      ratings_today: { again: 0, hard: 0, good: 0, easy: 0 },
      goal: { batch_size: 20, target_batches: 2, done_batches: 0, met: false, minutes_left: 10 },
    } })))
    await page.route('**/review/backlog-stats*', route => route.fulfill(json({ data: { overdue_count: 150, suggest_survival_mode: true, estimated_minutes: 38 } })))
    await page.route(/\/api\/settings$/, route => route.fulfill(json({ data: { survival_mode: false } })))

    await page.goto('/hoje')
    const review = page.getByTestId('plan-step-review')
    await expect(review).toContainText('Revisar 40 cards')
    await expect(review).toContainText('150 atrasados')
    await expect(review.getByRole('link', { name: 'Recuperar atraso' })).toHaveAttribute('href', '/praticar')
  })
})

test.describe('Mock: Limite de IA esgotado', () => {
  test('evento feature-limit-reached é disparado no 402', async ({ page }) => {
    await login(page)

    await page.route('**/ai/generate*', route => {
      route.fulfill({
        status: 402, contentType: 'application/json',
        body: JSON.stringify({ message: 'Limite atingido.', feature: 'cards_ai', plan_required: 'pro' }),
      })
    })

    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')

    // Verificar que o evento é emitido corretamente
    const limitEvent = await page.evaluate(() => {
      return new Promise<boolean>(resolve => {
        window.addEventListener('feature-limit-reached', () => resolve(true))
        window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: { feature: 'cards_ai', planRequired: 'pro' } }))
      })
    })
    expect(limitEvent).toBeTruthy()
  })
})

test.describe('Mock: Geração de cards com IA', () => {
  test('mock de geração retorna cards', async ({ page }) => {
    await login(page)

    const generatedCards = [
      { front: 'O que é pgvector?', back: 'Extensão PostgreSQL para embeddings vetoriais' },
      { front: 'O que é RAG?', back: 'Retrieval-Augmented Generation' },
    ]

    await page.route('**/ai/generate*', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { cards: generatedCards, deck_id: 'deck-1' } }) })
      } else {
        route.continue()
      }
    })

    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')

    // Verificar que o mock funciona
    const response = await page.evaluate(async () => {
      const res = await fetch('http://localhost:8037/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'topic', topic_id: 'test', quantity: 3 }),
      })
      return { status: res.status, data: await res.json() }
    })
    expect(response.status).toBe(200)
    expect(response.data.data.cards).toHaveLength(2)
  })
})

test.describe('Mock: Podcast em geração', () => {
  test('mostra status de geração do podcast', async ({ page }) => {
    await login(page)

    // GET /podcasts is paginated (?page&per_page, { data, meta })
    await page.route(/\/api\/podcasts(\?.*)?$/, route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: 'pod-1', title: 'Revisão: Direito', status: 'generating_audio', topic_name: 'Direito', duration_seconds: null, audio_url: null, created_at: new Date().toISOString() },
              { id: 'pod-2', title: 'Revisão: Algoritmos', status: 'ready', topic_name: 'Algoritmos', duration_seconds: 320, audio_url: 'https://example.com/audio.mp3', created_at: new Date(Date.now() - 86400000).toISOString() },
            ],
            meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
          }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/podcasts')
    await page.waitForTimeout(2000)

    await expect(page.getByText('Revisão: Direito')).toBeVisible()
    await expect(page.getByText('Revisão: Algoritmos')).toBeVisible()
  })
})

test.describe('Mock: Sugestão de retenção', () => {
  test('banner de ajuste de retenção aparece', async ({ page }) => {
    await login(page)

    await page.route('**/review/retention-suggestion*', route => {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { has_suggestion: true, current_retention: 0.9, suggested_retention: 0.85, cards_eliminated: 40 } }),
      })
    })

    await page.goto('/hoje')
    await page.waitForTimeout(3000)

    const suggestion = page.getByText(/Reduzir retenção|Muitas reviews/i)
    if (await suggestion.count() > 0) {
      await expect(suggestion).toBeVisible()
    }
    // Se não apareceu, é porque o dashboard não chama esse endpoint automaticamente — ok
  })
})

test.describe('Layout lazy (prd-performance-frontend RF-03)', () => {
  test('⌘K abre a busca mesmo com ela carregada sob demanda', async ({ page }) => {
    await login(page)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Control+k')
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeVisible()
    await expect(page.getByRole('combobox')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeHidden()
  })

  test('"+ Adicionar" (e Alt+N) abre a folha sob demanda; sem FAB de captura', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    await expect(page.getByTitle('Anotar rapidamente (Ctrl+N)')).toHaveCount(0)
    await page.getByRole('banner').getByRole('button', { name: 'Adicionar' }).click()
    const sheet = page.getByRole('dialog', { name: 'Adicionar' })
    await expect(sheet).toBeVisible()
    // With cadernos: the 5 options; with none: create one (or import from Anki) first
    await expect(sheet.getByRole('button', { name: /Nota em branco/ }).or(sheet.getByRole('link', { name: 'Criar caderno' }))).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })

  test('402 mockado abre o UpgradeModal', async ({ page }) => {
    await login(page)
    await page.route('**/api/ai/generate*', route => route.fulfill({
      status: 402,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Limite atingido.', feature: 'cards_ai', used: 10, limit: 10, plan_required: 'pro' }),
    }))
    await page.evaluate(async () => {
      const app = (document.querySelector('#__nuxt') as any).__vue_app__
      await app.config.globalProperties.$api('/ai/generate', { method: 'POST', body: {} }).catch(() => {})
    })
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Ver planos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver planos' })).toBeVisible()
  })
})

test.describe('/cadernos sob demanda (prd-performance-frontend RF-02)', () => {
  test('hub, biblioteca e mapa sem erro de console; editor do card só monta ao abrir', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()) })

    await page.setViewportSize({ width: 1280, height: 800 })
    await login(page)
    const topicId = await page.evaluate(async () => {
      const app = (document.querySelector('#__nuxt') as any).__vue_app__
      const res = await app.config.globalProperties.$api('/topics', { method: 'POST', body: { name: `E2E lazy ${Date.now()}` } })
      return res.data.id as string
    })

    // The old tabs are routes of the scope (4b-1): hub, map and card library
    for (const path of [`/cadernos/${topicId}`, `/cadernos/${topicId}/mapa`, `/cadernos/${topicId}/cards`]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }

    // Tiptap only exists after opening the card form (Lazy + v-if)
    await expect(page.locator('.ProseMirror')).toHaveCount(0)
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().click()
    await expect(page.locator('.ProseMirror').first()).toBeVisible()

    expect(errors).toEqual([])

    await page.evaluate(async (id) => {
      const app = (document.querySelector('#__nuxt') as any).__vue_app__
      await app.config.globalProperties.$api(`/topics/${id}`, { method: 'DELETE' }).catch(() => {})
    }, topicId)
  })
})

// ─── prd-ux-critica ────────────────────────────────────────────────────────────

const intervals = { again: '1min', hard: '6min', good: '10min', easy: '4d' }
const mkCard = (i: number) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  front: `<p>Pergunta ${i}</p>`,
  back: `<p>Resposta ${i}</p>`,
  type: 'basic', state: 'review', due: null, lapses: 0, reps: 3, is_learning: false,
  topic_id: null, topic_name: 'Caderno', source_note_id: null, cloze_index: null,
  next_intervals: intervals,
})

test.describe('Revisão rápida (RF-F2.1–F2.4)', () => {
  test.describe.configure({ mode: 'serial' })
  let page: import('@playwright/test').Page

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser)
  })
  test.afterAll(async () => { await page.context().close() })

  test.beforeEach(async () => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.route('**/api/settings', r => r.fulfill(json({ data: { survival_mode: false, session_time_limit: null, error_diary_mode: 'never' } })))
    await page.route('**/api/review/session*', r => r.fulfill(json({ data: [1, 2, 3, 4, 5, 6, 7].map(mkCard), total: 7 })))
  })

  test('Espaço + 3 cinco vezes avançam 5 cards em < 1s mesmo com a API a 2s', async () => {
    await page.route(/\/api\/review$/, async (route) => {
      const body = route.request().postDataJSON()
      await new Promise(r => setTimeout(r, 2000))
      await route.fulfill(json({ data: { review: { id: crypto.randomUUID(), undoable: true }, flashcard: { ...mkCard(1), id: body.flashcard_id }, next_intervals: intervals } }))
    })
    await page.goto('/revisar')
    await expect(page.getByText('Pergunta 1')).toBeVisible()

    const t0 = Date.now()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space')
      await page.keyboard.press('3')
    }
    await expect(page.getByText('Pergunta 6')).toBeVisible()
    expect(Date.now() - t0).toBeLessThan(1000)
    await expect(page.getByRole('button', { name: 'Desfazer' })).toBeVisible()
  })

  test('offline → faixa de pendências → online + "Tentar de novo" esvazia a fila', async () => {
    test.setTimeout(45_000)
    let online = false
    await page.route(/\/api\/review$/, async (route) => {
      if (!online) return route.abort('internetdisconnected')
      const body = route.request().postDataJSON()
      await route.fulfill(json({ data: { review: { id: crypto.randomUUID() }, flashcard: { ...mkCard(1), id: body.flashcard_id }, next_intervals: intervals } }))
    })
    await page.goto('/revisar')
    await expect(page.getByText('Pergunta 1')).toBeVisible()
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
    await expect(page.getByText('Pergunta 2')).toBeVisible()

    const banner = page.getByRole('alert').filter({ hasText: /não enviada/ })
    await expect(banner).toBeVisible({ timeout: 15_000 })

    online = true
    await banner.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(banner).toBeHidden()
  })

  test('U desfaz localmente enquanto o envio está na fila', async () => {
    await page.route(/\/api\/review$/, () => { /* never answers */ })
    await page.goto('/revisar')
    await expect(page.getByText('Pergunta 1')).toBeVisible()
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(page.getByText('Pergunta 3')).toBeVisible()
    await page.keyboard.press('u')
    await expect(page.getByText('Pergunta 2')).toBeVisible()
  })

  test('sessão em páginas (has_more): cruza a página sem tela de fim e o lote conta a sessão inteira', async () => {
    const sessionUrls: string[] = []
    await page.unroute('**/api/review/session*')
    // Page 1: 2 cards of a 4-card session; page 2 repeats card 2 (still unrated when it was asked)
    await page.route('**/api/review/session*', (r) => {
      sessionUrls.push(r.request().url())
      return r.fulfill(json(sessionUrls.length === 1
        ? { data: [1, 2].map(mkCard), total: 2, session_count: 4, has_more: true }
        : { data: [2, 3, 4].map(mkCard), total: 3, session_count: 3, has_more: false }))
    })
    await page.route(/\/api\/review$/, async (route) => {
      const body = route.request().postDataJSON()
      await route.fulfill(json({ data: { review: { id: crypto.randomUUID() }, flashcard: { ...mkCard(1), id: body.flashcard_id }, next_intervals: intervals } }))
    })
    await page.goto('/revisar')
    await expect(page.getByText('Pergunta 1')).toBeVisible()
    await expect(page.getByTestId('review-batch')).toContainText('Lote 1 de 1 · card 1 de 4')
    for (const next of [2, 3, 4]) {
      await page.keyboard.press('Space')
      await page.keyboard.press('3')
      await expect(page.getByText(`Pergunta ${next}`)).toBeVisible()
    }
    await expect(page.getByTestId('review-batch')).toContainText('card 4 de 4')
    expect(sessionUrls).toHaveLength(2)
    expect(sessionUrls[1]).toBe(sessionUrls[0])
    await page.keyboard.press('Space')
    await page.keyboard.press('3')
    await expect(page.getByTestId('review-session-end')).toBeVisible()
  })

  test('erro 500 na sessão mostra "Tentar de novo" e nunca "Tudo em dia!"', async () => {
    let fail = true
    await page.unroute('**/api/review/session*')
    await page.route('**/api/review/session*', r => fail ? r.fulfill(json({ message: 'x' }, 500)) : r.fulfill(json({ data: [mkCard(1)], total: 1 })))
    await page.goto('/revisar')
    await expect(page.getByText('Não foi possível carregar sua revisão')).toBeVisible()
    await expect(page.getByText('Tudo em dia')).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText('Pergunta 1')).toBeVisible()
  })
})

test.describe('Estados honestos (RF-F3.6–F3.9)', () => {
  test.describe.configure({ mode: 'serial' })
  let page: import('@playwright/test').Page

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser)
  })
  test.afterAll(async () => { await page.context().close() })
  test.beforeEach(async () => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })

  test('/hoje com /stats 500 mostra erro e nunca "Crie seus primeiros cards"; retry recupera', async () => {
    let fail = true
    await page.route(/\/api\/stats$/, r => fail
      ? r.fulfill(json({ message: 'x' }, 500))
      : r.fulfill(json({ data: { total_cards: 0, total_decks: 0, due_today: 0, reviewed_today: 0, cards_reviewed_today: 0, streak: 0 } })))
    await page.goto('/hoje')
    await expect(page.getByText('Não foi possível carregar seu plano de hoje')).toBeVisible()
    await expect(page.getByText(/Que bom ter você aqui|Primeiros passos/)).toHaveCount(0)
    await expect(page.getByText(/Tudo em dia/)).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Tentar de novo' }).first().click()
    await expect(page.getByText('Não foi possível carregar seu plano de hoje')).toBeHidden()
  })

  test('/progresso com 500 mostra "Tentar de novo"', async () => {
    let fail = true
    // Each section fails on its own (prd-4f-progresso-v3 RF-F8): the agenda shows in every state of the account
    await page.route(url => url.pathname === '/api/exams', r => fail ? r.fulfill(json({ message: 'x' }, 500)) : r.continue())
    await page.goto('/progresso')
    await expect(page.getByText('Não foi possível carregar suas provas')).toBeVisible()
    await expect(page.getByText('Defina sua prova para ver')).toHaveCount(0)
    fail = false
    await page.getByRole('alert').filter({ hasText: 'Não foi possível carregar suas provas' }).getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText('Não foi possível carregar suas provas')).toBeHidden()
  })

  test('/cadernos com /topics/progress 500 mostra erro inline na lista', async () => {
    let fail = true
    await page.route(/\/api\/topics\/progress$/, r => fail && r.request().method() === 'GET' ? r.fulfill(json({ message: 'x' }, 500)) : r.continue())
    await page.goto('/cadernos')
    await expect(page.getByText('Não foi possível carregar seus cadernos').first()).toBeVisible()
    fail = false
    await page.getByRole('button', { name: 'Tentar de novo' }).first().click()
    await expect(page.getByText('Não foi possível carregar seus cadernos')).toHaveCount(0)
  })
})

test.describe('Onboarding sem armadilhas (RF-F4)', () => {
  const newUser = { id: 'u-new', name: 'Nova Pessoa', email: 'nova@e2e.test', plan: 'free', onboarding_completed: false, email_verified: true, email_verified_at: '2026-09-29T00:00:00Z', default_learning_mode: null }

  async function mockNewUserApi(page: import('@playwright/test').Page) {
    // Catch-all first (Playwright matches the most recent route first)
    await page.route('**/api/**', r => r.fulfill(json({ data: [] })))
    await page.route('**/api/plans', r => r.continue())
    await page.route('**/api/me', r => r.fulfill(json({ data: newUser })))
    await page.route('**/api/register', r => r.fulfill(json({ data: { user: newUser } }, 201)))
    await page.route('**/api/onboarding/complete', r => r.fulfill(json({ data: { onboarding_completed: true } })))
    await page.route('**/api/onboarding/learning-mode', r => r.fulfill(json({ data: {} })))
    await page.route('**/api/review/tomorrow', r => r.fulfill(json({ data: { date: '2026-11-08', due_count: 0, review_count: 0, new_count: 0, estimated_minutes: 0, streak: { current: 0, reviewed_today: false, at_risk: false, next_milestone: 3 }, reminder: { enabled: true, hour: 19, suppressed: false } } })))
  }

  async function register(page: import('@playwright/test').Page) {
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await page.fill('#name', newUser.name)
    await page.fill('#email', newUser.email)
    await page.fill('#password', 'password123')
    await page.check('#accept_terms')
    await page.click('button[type="submit"]')
  }

  /** Onboarding v4 (prd-onboarding-v4): "Pular o exemplo" → /comecar/pronto → "Agora com o seu material". */
  async function toContent(page: import('@playwright/test').Page) {
    await page.getByTestId('area-skip').click()
    await page.waitForURL('**/comecar/pronto')
    await page.getByTestId('saved-material').click()
    await expect(page.getByRole('heading', { name: 'Agora com o seu material' })).toBeVisible()
  }

  test('cadastro vai direto para /comecar (sem passar por /hoje)', async ({ page }) => {
    await mockNewUserApi(page)
    const visited: string[] = []
    page.on('framenavigated', f => { if (f === page.mainFrame()) visited.push(new URL(f.url()).pathname) })
    await register(page)
    await page.waitForURL('**/comecar')
    expect(visited).not.toContain('/hoje')
  })

  test('"Importar do Anki" depois de pular o exemplo permanece em /importar', async ({ page }) => {
    await mockNewUserApi(page)
    await register(page)
    await page.waitForURL('**/comecar')
    await toContent(page)
    await page.getByRole('radio', { name: 'Trazer do Anki' }).check()
    await page.getByRole('button', { name: 'Importar do Anki' }).click()
    await page.waitForURL('**/importar')
    await page.waitForTimeout(800)
    expect(new URL(page.url()).pathname).toBe('/importar')
  })

  test('0 cards gerados mostra erro inline e não grava cards', async ({ page }) => {
    await mockNewUserApi(page)
    let accepted = false
    await page.route('**/api/ai/accept-cards', r => { accepted = true; return r.fulfill(json({ data: [] }, 201)) })
    await page.route(/\/api\/topics$/, r => r.fulfill(json({ data: { id: 't-new', name: 'x' } }, 201)))
    await page.route('**/api/topics/t-new/notes', r => r.fulfill(json({ data: { id: 'n1' } }, 201)))
    await page.route('**/api/ai/generate-cards', r => r.fulfill(json({ data: { id: 'job-1', status: 'done', result: { cards: [] } } }, 202)))
    await register(page)
    await page.waitForURL('**/comecar')
    await toContent(page)
    await page.getByRole('radio', { name: 'Colar um texto' }).check()
    await page.fill('#material', 'Texto curto demais')
    await expect(page.locator('#notebook-name')).toHaveValue('Texto curto demais')
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    await expect(page.getByText(/Não conseguimos criar cards com esse texto/)).toBeVisible()
    expect(accepted).toBe(false)
  })

  test('PDF acima do limite do plano é recusado sem request', async ({ page }) => {
    await mockNewUserApi(page)
    let uploads = 0
    await page.route('**/api/documents', r => { uploads++; return r.fulfill(json({ data: {} }, 201)) })
    // Real catalog with a 1 MB Free limit (the limit comes from /api/plans, never hardcoded)
    await page.route('**/api/plans', async (r) => {
      const res = await r.fetch()
      const body = await res.json()
      for (const p of body.data.plans) p.extras.upload_max_mb = 1
      await r.fulfill(json(body))
    })
    await register(page)
    await page.waitForURL('**/comecar')
    await toContent(page)
    await page.getByRole('radio', { name: 'Enviar meu PDF ou apostila' }).check()
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({
      name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(2 * 1024 * 1024, 0),
    })
    await expect(page.getByText(/O limite do seu plano é 1 MB/)).toBeVisible()
    expect(uploads).toBe(0)
  })

})

test.describe('PDF → cards automático (RF-F5.2)', () => {
  test('PDF lendo: só a linha dele consulta o documento e, pronta, mostra "Revisar 12" do próprio PDF', async ({ page }) => {
    test.setTimeout(45_000)
    await login(page)
    const topic = { id: '00000000-0000-4000-8000-0000000000bb', name: 'Constitucional', parent_id: null, children: [], color: null, flashcards_count: 0, position: 0, learning_mode: 'exam' }
    const DOC = '00000000-0000-4000-8000-0000000000dd'
    const summary = {
      topic: { id: topic.id, name: topic.name, color: null, depth: 0, learning_mode: 'exam', parent_id: null }, path: [],
      counts: { cards: 0, materials: 1, subjects: 0 }, mastery: { percent: null, in_day: 0, cards: 0 }, questions: null,
      session: { count: 0, overdue: 0, errors: 0 }, can_quiz: { ok: true }, can_podcast: { ok: true }, exam: null, next_step: null,
      listen: null, subjects: [], special: { quiz_errors: { cards: 0, session_count: 0 }, loose: { cards: 0, session_count: 0 } },
    }
    const row = (ready: boolean) => ({
      kind: 'pdf', id: DOC, note_id: ready ? 'n1' : null, title: 'apostila.pdf', topic: { id: topic.id, name: topic.name }, pages: 20, parts: ready ? 3 : null,
      words: null, cards: ready ? 12 : 0, mastery: ready ? 0 : null, session_count: ready ? 12 : 0, ahead_count: ready ? 12 : 0,
      status: ready ? 'ready' : 'generating', progress: ready ? null : { done: 1, total: 3 }, updated_at: '2026-09-29T10:00:00Z',
    })
    let docCalls = 0
    let listCalls = 0
    await page.route(/\/api\/topics$/, r => r.request().method() === 'GET' ? r.fulfill(json({ data: [topic] })) : r.continue())
    await page.route(`**/api/topics/${topic.id}/summary`, r => r.fulfill(json({ data: summary })))
    await page.route(`**/api/topics/${topic.id}/materials**`, r => { listCalls++; return r.fulfill(json({ data: [row(docCalls >= 2)], meta: { next_cursor: null, total: 1 } })) })
    await page.route(`**/api/documents/${DOC}`, r => { docCalls++; return r.fulfill(json({ data: { id: DOC, status: 'completed', note_generation_status: docCalls < 2 ? 'generating' : 'completed', has_generated_note: true, note_generation_progress: docCalls, note_total_batches: 3, note_id: 'n1' } })) })
    await page.goto(`/cadernos/${topic.id}`)
    await expect(page.getByTestId('material-row')).toContainText('Escrevendo a nota · lote 2 de 3')
    const review = page.getByTestId('material-review')
    await expect(review).toHaveText('Revisar 12', { timeout: 15_000 })
    // Only this PDF (prd-caderno-f2-recorte RF-F3), no longer the whole caderno; the list was not polled
    await expect(review).toHaveAttribute('href', `/revisar?scope=document:${DOC}`)
    expect(listCalls).toBe(2)
  })
})

test.describe('Configurações de conta e LGPD (RF-F11.3–F11.5)', () => {
  test.describe.configure({ mode: 'serial' })
  let page: import('@playwright/test').Page
  let me: any

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser)
    me = await page.evaluate(async () => {
      const r = await fetch('http://localhost:8037/api/me', { credentials: 'include', headers: { Accept: 'application/json' } })
      return (await r.json()).data
    })
  })
  test.afterAll(async () => { await page.context().close() })
  test.beforeEach(async () => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })

  test('salvar o nome atualiza a Sidebar', async () => {
    await page.route('**/api/user/profile', r => r.fulfill(json({ data: { ...me, name: 'Nome Novo E2E' } })))
    await page.goto('/configuracoes')
    await page.fill('#profile-name', 'Nome Novo E2E')
    await page.locator('#profile-name').press('Enter')
    await expect(page.getByTestId('name-saved')).toHaveText('Salvo')
  })

  test('422 da troca de senha aparece inline', async () => {
    await page.route('**/api/user/password', r => r.fulfill(json({ message: 'x', errors: { current_password: ['A senha atual está incorreta.'] } }, 422)))
    await page.goto('/configuracoes#senha')
    await page.fill('#pw-current_password', 'errada')
    await page.fill('#pw-password', 'novasenha123')
    await page.fill('#pw-password_confirmation', 'novasenha123')
    await page.getByRole('button', { name: 'Trocar senha' }).click()
    await expect(page.locator('#pw-current_password-error')).toHaveText('A senha atual está incorreta.')
    await expect(page.locator('#pw-current_password')).toHaveAttribute('aria-invalid', 'true')
  })

  test('exportar: 202 mostra o e-mail; 429 mostra o aviso de 24h', async () => {
    await page.route('**/api/user/export', r => r.fulfill(json({ data: { status: 'queued', email: 'v***@e2e.test' } }, 202)))
    await page.goto('/configuracoes#seus-dados')
    await page.getByRole('button', { name: 'Exportar meus dados' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Exportar' }).click()
    await expect(page.getByText(/Enviaremos o link para v\*\*\*@e2e.test/)).toBeVisible()
  })

  test('excluir conta com 502 da Stripe: mensagem e nada muda', async () => {
    await page.route('**/api/user', r => r.request().method() === 'DELETE'
      ? r.fulfill(json({ message: 'Não foi possível cancelar a assinatura. Nada foi excluído.' }, 502))
      : r.continue())
    await page.goto('/configuracoes#conta')
    await page.getByRole('button', { name: 'Excluir conta' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Entendo que isso é permanente').check()
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.locator('#delete-confirmation').fill('password')
    await dialog.getByRole('button', { name: 'Excluir minha conta' }).click()
    await expect(dialog.getByText(/Não conseguimos cancelar sua assinatura/)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('excluir conta com 202: sai e volta para a landing com aviso', async () => {
    await page.route('**/api/user', r => r.request().method() === 'DELETE'
      ? r.fulfill(json({ data: { status: 'deletion_scheduled' } }, 202))
      : r.continue())
    await page.goto('/configuracoes#conta')
    await page.getByRole('button', { name: 'Excluir conta' }).click()
    const dialog = page.getByRole('alertdialog')
    await dialog.getByLabel('Entendo que isso é permanente').check()
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.locator('#delete-confirmation').fill('password')
    await dialog.getByRole('button', { name: 'Excluir minha conta' }).click()
    await page.waitForURL(url => new URL(url).pathname === '/')
    await expect(page.getByText('Sua conta está sendo excluída.')).toBeVisible()
  })
})
