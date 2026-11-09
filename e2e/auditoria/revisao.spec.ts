import { test, expect, gotoApp, apiCall, uid, cachedLoginState, continueBand } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Revisão: todas as notas (ratings), desfazer, sessão vazia, atalhos de teclado e falhas da API.
 * Cada teste cria um caderno próprio e abre /revisar?topic_id=… para não depender de outros dados.
 */
test.use({ auditUser: 'pro' })

const cardFace = (page: Page) => page.getByTestId('review-card')
// Revisão v3 (prd-4d-revisao-v3 RF-F4): the same order everywhere, Anki's labels
const RATINGS = ['De novo', 'Difícil', 'Bom', 'Fácil'] as const
const answer = (page: Page) => page.getByTestId('review-answer')

async function seedTopic(page: Page, n: number) {
  await gotoApp(page, '/hoje')
  const t = await apiCall(page, 'POST', '/topics', { name: `Revisão ${uid()}` })
  const cards = Array.from({ length: n }, (_, i) => ({ front: `Pergunta ${i + 1}`, back: `Resposta ${i + 1}` }))
  const created = await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.data.id, cards })
  return { topicId: t.data.id as string, cardIds: (created.data as any[]).map(c => c.id as string) }
}

async function card(page: Page, id: string) {
  return (await apiCall(page, 'GET', `/flashcards/${id}`)).data
}

test.describe('Revisão — caminho feliz', () => {
  test('revisa 4 cards usando as 4 notas (clique e teclado) e chega ao resumo', async ({ page }) => {
    const { topicId, cardIds } = await seedTopic(page, 4)
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    await expect(cardFace(page)).toContainText('Pergunta')

    // Card 1: vira com clique e avalia "Fácil" pelo botão
    await cardFace(page).click()
    await expect(page.getByRole('button', { name: /^Fácil/ })).toBeVisible()
    for (const label of RATINGS) await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible()
    await page.getByRole('button', { name: /^Fácil/ }).click()
    await continueBand(page)

    // Cards 2–4: Espaço vira, 4 avalia (Fácil tira o card da sessão de hoje)
    for (let i = 0; i < 3; i++) {
      await expect(page.getByRole('button', { name: 'Card: Espaço para ver a resposta' })).toBeVisible()
      await page.keyboard.press('Space')
      await expect(answer(page)).toBeVisible()
      await page.keyboard.press('4')
      await continueBand(page)
    }
    // Fim da sessão (B1: a tag não resolvia e a tela ficava em branco), com o "Amanhã"
    await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('tomorrow-load')).toContainText('Amanhã')

    // Servidor registrou as 4 revisões
    await expect.poll(async () => (await Promise.all(cardIds.map(id => card(page, id)))).every((c: any) => c.reps === 1)).toBe(true)
  })

  test('as 4 notas chegam ao servidor (1–4) e "De novo" mantém o card na sessão', async ({ page }) => {
    const { topicId } = await seedTopic(page, 2)
    const ratings: number[] = []
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/review')) ratings.push(JSON.parse(r.postData() ?? '{}').rating) })
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    for (const key of ['1', '2']) {
      await page.keyboard.press('Space')
      await expect(answer(page)).toBeVisible()
      await page.keyboard.press(key)
      await continueBand(page)
      // "De novo" abre o diário de erro (carregado sob demanda): pula para seguir
      const diary = page.getByTestId('error-diary')
      await expect(diary.or(page.getByTestId('review-show'))).toBeVisible()
      if (await diary.isVisible()) await diary.getByRole('button', { name: 'Pular' }).click()
    }
    await expect.poll(() => ratings).toEqual([1, 2])
  })

  test('desfazer: botão, tecla U e Ctrl+Z voltam o card e revertem no servidor', async ({ page }) => {
    const { topicId, cardIds } = await seedTopic(page, 2)
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    const first = (await cardFace(page).innerText()).match(/Pergunta \d/)![0]

    // Botão "Desfazer"
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await continueBand(page)
    await expect(cardFace(page)).not.toContainText(first)
    await page.getByRole('button', { name: /^Desfazer/ }).click()
    await expect(cardFace(page)).toContainText(first)
    await expect(page.getByText('Avaliação desfeita')).toBeAttached()

    // Tecla U
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await continueBand(page)
    await expect(cardFace(page)).not.toContainText(first)
    await page.keyboard.press('u')
    await expect(cardFace(page)).toContainText(first)

    // Ctrl+Z
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await continueBand(page)
    await expect(cardFace(page)).not.toContainText(first)
    await page.keyboard.press('Control+z')
    await expect(cardFace(page)).toContainText(first)

    // Nada ficou registrado no servidor
    await expect.poll(async () => (await Promise.all(cardIds.map(id => card(page, id)))).map((c: any) => c.reps)).toEqual([0, 0])
  })

  test('atalhos: ? abre a ajuda, Esc fecha, 1–4 não avaliam antes de virar, E abre a edição', async ({ page }) => {
    const { topicId } = await seedTopic(page, 1)
    let posts = 0
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/review')) posts++ })
    await gotoApp(page, `/revisar?topic_id=${topicId}`)

    await page.keyboard.press('?')
    const help = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Atalhos da revisão' }) })
    await expect(help).toBeVisible()
    await expect(help.getByText('Desfazer a última avaliação')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()

    await page.keyboard.press('3')
    await page.waitForTimeout(500)
    expect(posts).toBe(0)
    await expect(page.getByRole('button', { name: 'Card: Espaço para ver a resposta' })).toBeVisible()

    await page.keyboard.press('e')
    await expect(page.getByRole('dialog', { name: 'Editar card' })).toBeVisible()
    // Com o modal aberto, atalhos não avaliam
    await page.keyboard.press('4')
    expect(posts).toBe(0)
  })
})

test.describe('Revisão — caminho triste', () => {
  test('sessão vazia de quem tem cards: "Tudo em dia" (sem celebração) e volta ao caderno', async ({ page }) => {
    const { topicId } = await seedTopic(page, 1)
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await continueBand(page)
    await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 10_000 })
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    const done = page.getByTestId('review-all-done')
    await expect(done.getByRole('heading', { name: 'Tudo em dia' })).toBeVisible()
    await expect(page.locator('[data-celebration-title]')).toHaveCount(0)
    await page.keyboard.press('Space') // nenhum atalho quebra a tela vazia
    await done.getByRole('link', { name: /^Voltar/ }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${topicId}$`))
  })

  test('erro 500 ao carregar a sessão: erro com "Tentar de novo" (nunca "Tudo em dia")', async ({ page }) => {
    const { topicId } = await seedTopic(page, 1)
    let fail = true
    await page.route('**/api/review/session*', route => fail ? route.fulfill({ status: 500, json: { message: 'Server Error' } }) : route.fallback())
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    const error = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar sua revisão' })
    await expect(error).toBeVisible()
    await expect(page.getByText('Tudo em dia')).toHaveCount(0)
    fail = false
    await error.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(cardFace(page)).toContainText('Pergunta 1')
  })

  test('avaliação que não chega ao servidor: aviso "não enviada" + "Tentar de novo" reenvia', async ({ page }) => {
    test.setTimeout(60_000)
    const { topicId, cardIds } = await seedTopic(page, 2)
    let offline = true
    await page.route('**/api/review', route => offline && route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.fallback())
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await continueBand(page)
    // 3 tentativas com backoff (1 s, 2 s, 4 s) e depois pausa com aviso
    const banner = page.getByRole('alert').filter({ hasText: 'avaliação não enviada' })
    await expect(banner).toBeVisible({ timeout: 15_000 })
    offline = false
    await banner.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(banner).toBeHidden({ timeout: 10_000 })
    await expect.poll(async () => (await Promise.all(cardIds.map(id => card(page, id)))).filter((c: any) => c.reps === 1).length).toBe(1)
  })
})

test.describe('Revisar do caderno com volume (seed perf@audit.test, prd-performance-caderno)', () => {
  test('"Revisar N" do cabeçalho é o tamanho da sessão que abre (páginas de até 100)', async ({ browser }) => {
    // Seed: memorai-api/scripts/perf/seed-caderno-pesado.php (only GETs here: nothing is rated)
    const ctx = await browser.newContext({ storageState: await cachedLoginState(browser, 'perf@audit.test', 'password') })
    const page = await ctx.newPage()
    await gotoApp(page, '/hoje')
    const heavy = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.name === 'Direito — TRF (pesado)')
    test.skip(!heavy, 'seed pesado ausente')

    await gotoApp(page, `/cadernos/${heavy.id}`)
    const cta = page.getByTestId('scope-review')
    const n = Number((await cta.innerText()).match(/· (\d+)/)![1])
    const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
    await cta.click()
    const body = await (await session).json()
    expect(body.session_count).toBe(n)
    expect(body.data.length).toBeLessThanOrEqual(100)
    // The batches come from the same number: ceil(N / 20), across pages of 100
    await expect(page.getByTestId('review-batch')).toContainText(`Lote 1 de ${Math.ceil(n / 20)}`)
    await ctx.close()
  })

  test('o "Revisar N" do plano do Hoje é o tamanho da sessão global (atrasados contados uma vez)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: await cachedLoginState(browser, 'perf@audit.test', 'password') })
    const page = await ctx.newPage()
    await gotoApp(page, '/hoje')
    const heavy = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.name === 'Direito — TRF (pesado)')
    test.skip(!heavy, 'seed pesado ausente')

    const n = Number((await page.getByTestId('plan-step-review').innerText()).match(/Revisar (\d+)/)?.[1])
    expect(n).toBe((await apiCall(page, 'GET', '/stats')).data.due_today)
    const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
    await gotoApp(page, '/revisar')
    expect((await (await session).json()).session_count).toBe(n)
    await expect(page.getByTestId('review-batch')).toContainText(`Lote 1 de ${Math.ceil(n / 20)}`)
    await ctx.close()
  })
})
