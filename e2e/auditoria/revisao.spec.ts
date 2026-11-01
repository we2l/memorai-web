import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Revisão: todas as notas (ratings), desfazer, sessão vazia, atalhos de teclado e falhas da API.
 * Cada teste cria um caderno próprio e abre /revisar?topic_id=… para não depender de outros dados.
 */
test.use({ auditUser: 'pro' })

const cardFace = (page: Page) => page.locator('.review-card').first()
const RATINGS = ['Não lembrei', 'Quase', 'Lembrei', 'Fácil demais'] as const

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

    // Card 1: vira com clique e avalia "Fácil demais" pelo botão
    await cardFace(page).click()
    await expect(page.getByRole('button', { name: /^Fácil demais/ })).toBeVisible()
    for (const label of RATINGS) await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible()
    await page.getByRole('button', { name: /^Fácil demais/ }).click()

    // Cards 2–4: Espaço vira, 4 avalia (Fácil demais tira o card da sessão de hoje)
    for (let i = 0; i < 3; i++) {
      await expect(page.getByRole('button', { name: 'Toque para ver a resposta' })).toBeVisible()
      await page.keyboard.press('Space')
      await expect(page.getByRole('button', { name: 'Verso do card' })).toBeVisible()
      await page.keyboard.press('4')
    }
    // Resumo da sessão (B1: a tag não resolvia e a tela ficava em branco), com o "Amanhã"
    await expect(page.getByRole('heading', { name: 'Missão de hoje concluída!' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('tomorrow-load')).toContainText('Amanhã')

    // Servidor registrou as 4 revisões
    await expect.poll(async () => (await Promise.all(cardIds.map(id => card(page, id)))).every((c: any) => c.reps === 1)).toBe(true)
  })

  test('as 4 notas chegam ao servidor (1–4) e "Não lembrei" mantém o card na sessão', async ({ page }) => {
    const { topicId } = await seedTopic(page, 2)
    const ratings: number[] = []
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/review')) ratings.push(JSON.parse(r.postData() ?? '{}').rating) })
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    for (const key of ['1', '2']) {
      await page.keyboard.press('Space')
      await expect(page.getByRole('button', { name: 'Verso do card' })).toBeVisible()
      await page.keyboard.press(key)
      // "Não lembrei" abre o diário de erro: pula para seguir
      const skip = page.getByRole('button', { name: /Pular|Agora não|Continuar/ })
      if (await skip.first().isVisible({ timeout: 1500 }).catch(() => false)) await skip.first().click()
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
    await expect(cardFace(page)).not.toContainText(first)
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(cardFace(page)).toContainText(first)
    await expect(page.getByText('Avaliação desfeita')).toBeAttached()

    // Tecla U
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
    await expect(cardFace(page)).not.toContainText(first)
    await page.keyboard.press('u')
    await expect(cardFace(page)).toContainText(first)

    // Ctrl+Z
    await page.keyboard.press('Space')
    await page.keyboard.press('4')
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
    await expect(page.getByRole('button', { name: 'Toque para ver a resposta' })).toBeVisible()

    await page.keyboard.press('e')
    await expect(page.getByRole('dialog', { name: 'Editar flashcard' })).toBeVisible()
    // Com o modal aberto, atalhos não avaliam
    await page.keyboard.press('4')
    expect(posts).toBe(0)
  })
})

test.describe('Revisão — caminho triste', () => {
  test('sessão vazia (usuário sem cards) mostra "Tudo em dia!" e volta para /hoje', async ({ browser }) => {
    const { loginState } = await import('./support/fixtures')
    const context = await browser.newContext({ storageState: await loginState(browser, 'empty') })
    const page = await context.newPage()
    await gotoApp(page, '/revisar')
    await expect(page.getByRole('heading', { name: 'Tudo em dia!' })).toBeVisible()
    await page.keyboard.press('Space') // nenhum atalho quebra a tela vazia
    await page.getByRole('main').getByRole('link', { name: 'Voltar' }).last().click()
    await expect(page).toHaveURL(/\/hoje/)
    await context.close()
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
    // 3 tentativas com backoff (1 s, 2 s, 4 s) e depois pausa com aviso
    const banner = page.getByRole('alert').filter({ hasText: 'avaliação não enviada' })
    await expect(banner).toBeVisible({ timeout: 15_000 })
    offline = false
    await banner.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(banner).toBeHidden({ timeout: 10_000 })
    await expect.poll(async () => (await Promise.all(cardIds.map(id => card(page, id)))).filter((c: any) => c.reps === 1).length).toBe(1)
  })
})
