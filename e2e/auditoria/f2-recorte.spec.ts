import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, tinker } from './support/fixtures'
import { ensureF2Seed, F2 } from './support/seed-f2'

/**
 * Caderno F2, sessão por recorte (prd-caderno-f2-recorte §9): "Revisar N" de um PDF, de um simulado e de um
 * episódio abre só aquele material, e N é o tamanho da sessão que ele abre.
 * Usuário próprio (e2e-recorte@audit.test, recriado a cada execução), dados em support/seed-f2.ts.
 * Nenhuma IA: o simulado concluído e o episódio são gravados no banco; os cards dos erros nascem da rota
 * real POST /quizzes/{id}/create-cards. Os testes são em série: um usa o estado do anterior.
 */
test.use({ auditUser: 'recorte' })
test.describe.configure({ mode: 'serial' })

const main = (page: Page) => page.getByRole('main')
/** The hub of the scope lists the materials (4b-1: no tabs). */
async function openMaterial(page: Page, topicId: string) {
  await gotoApp(page, `/cadernos/${topicId}`)
}
const materialRow = (page: Page, title: string) => page.getByTestId('material-row').filter({ hasText: title })
const sessionOf = (page: Page) => page.waitForResponse(r => r.url().includes('/api/review/session?') && r.request().method() === 'GET')

/** Rates every card of the screen "Fácil demais" (4), through the keyboard, until the session ends. */
async function finishSession(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Verso do card' })).toBeVisible()
    const rated = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/review'))
    await page.keyboard.press('4')
    await rated
  }
}

test('PDF: "Revisar N" abre só os cards daquele material, com o caminho do recorte', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  const docs = (await apiCall(page, 'GET', `/documents?topic_id=${seed.subjectId}`)).data as any[]
  const pdf = docs.find(d => d.id === seed.docId)
  expect(pdf.session_count).toBe(3)

  await openMaterial(page, seed.subjectId)
  const review = materialRow(page, F2.pdf).getByTestId('material-review')
  await expect(review).toHaveText('Revisar 3')
  await expect(review).toHaveAttribute('href', `/revisar?scope=document:${seed.docId}`)
  const session = sessionOf(page)
  await review.click()
  const body = await (await session).json()
  expect(body.session_count).toBe(3)
  expect(body.scope).toMatchObject({ type: 'document', id: seed.docId, label: F2.pdf, topic: { id: seed.subjectId } })
  expect(body.data.map((c: any) => c.id).sort()).toEqual([...seed.docCardIds].sort())
  await expect(page.getByTestId('review-scope')).toHaveText(`Revisando: ${F2.subject} › ${F2.pdf}`)
  await expect(page.getByText('2 restantes')).toBeVisible()

  // The end of the session goes back to the material
  await finishSession(page, 3)
  await expect(page.getByRole('link', { name: `Voltar a ${F2.pdf}` }).first()).toHaveAttribute('href', `/cadernos/${seed.subjectId}`)
})

test('PDF sem nada vencido: "Praticar adiantado (N)" com o aviso na sessão', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  const pdf = ((await apiCall(page, 'GET', `/documents?topic_id=${seed.subjectId}`)).data as any[]).find(d => d.id === seed.aheadDocId)
  expect(pdf).toMatchObject({ session_count: 0, ahead_count: 2 })
  await openMaterial(page, seed.subjectId)
  await materialRow(page, F2.aheadPdf).getByRole('button', { name: `Mais ações de ${F2.aheadPdf}` }).click()
  const ahead = page.getByRole('menuitem', { name: 'Praticar adiantado (2)' })
  await expect(ahead).toHaveAttribute('href', `/revisar?scope=document:${seed.aheadDocId}&ahead=1`)
  const session = sessionOf(page)
  await ahead.click()
  expect((await (await session).json()).session_count).toBe(2)
  await expect(page.getByText('Praticando adiantado: o agendamento continua sendo atualizado')).toBeVisible()
  await expect(page.getByTestId('review-scope')).toHaveText(`Revisando: ${F2.subject} › ${F2.aheadPdf}`)
})

test('"Só erros (N)" no menu do PDF conta e abre só os erros dele', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  // One lapsed card of the PDF, due now (the rule of "só erros" in a container: lapses and due)
  tinker(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('id', '${seed.docCardIds[0]}')->update(['lapses' => 1, 'due' => now()->subHour()]); echo 'ok';`)
  await openMaterial(page, seed.subjectId)
  await main(page).getByRole('button', { name: `Mais ações de ${F2.pdf}` }).click()
  const item = page.getByRole('menuitem', { name: /^Só erros \(1\)/ })
  await expect(item).toHaveAttribute('href', `/revisar?scope=document:${seed.docId}&errors_only=1`)
  const session = sessionOf(page)
  await item.click()
  const body = await (await session).json()
  expect(body.data.map((c: any) => c.id)).toEqual([seed.docCardIds[0]])
})

test('nota: "Revisar estes N" no rodapé da nota abre scope=note:', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  await gotoApp(page, `/cadernos/${seed.subjectId}/material/${seed.noteId}`)
  const link = main(page).getByRole('link', { name: 'Revisar estes 2' })
  await expect(link).toHaveAttribute('href', `/revisar?scope=note:${seed.noteId}`)
  const session = sessionOf(page)
  await link.click()
  const body = await (await session).json()
  expect(body.data.map((c: any) => c.id).sort()).toEqual([...seed.noteCardIds].sort())
  await expect(page.getByTestId('review-scope')).toHaveText(`Revisando: ${F2.subject} › Nota F2`)
})

test('simulado: "Revisar os N agora" traz só os cards dos erros (mesmo sem novos restantes no dia) e volta ao resultado', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  // 1 new card a day, already spent by the PDF session: the caderno has no new card left today
  await apiCall(page, 'PUT', '/settings', { daily_new_cards_limit: 1 })
  await gotoApp(page, `/simulados/${seed.quizId}/resultado`)
  const created = page.waitForResponse(r => r.url().endsWith(`/api/quizzes/${seed.quizId}/create-cards`))
  await main(page).getByRole('button', { name: 'Criar cards dos erros (2)' }).click()
  const answer = (await (await created).json()).data
  expect(answer.card_ids).toHaveLength(2)
  expect(answer.session_count).toBe(2)

  const now = main(page).getByRole('link', { name: 'Revisar os 2 agora' })
  await expect(now).toHaveAttribute('href', `/revisar?scope=quiz:${seed.quizId}`)
  const session = sessionOf(page)
  await now.click()
  const body = await (await session).json()
  expect(body.data.map((c: any) => c.id).sort()).toEqual([...answer.card_ids].sort())
  expect(body.scope).toMatchObject({ type: 'quiz', label: F2.quiz })

  await finishSession(page, 2)
  await page.getByRole('link', { name: `Voltar a ${F2.quiz}` }).first().click()
  await expect(page).toHaveURL(new RegExp(`/simulados/${seed.quizId}/resultado`))
  await apiCall(page, 'PUT', '/settings', { daily_new_cards_limit: 20 })
})

test('resultado recarregado mantém "Revisar os N" pelo cards_from_errors (lista explícita, sem teto do dia)', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  const quiz = (await apiCall(page, 'GET', `/quizzes/${seed.quizId}`)).data
  expect(quiz.cards_from_errors.count).toBe(2)
  await gotoApp(page, `/simulados/${seed.quizId}/resultado`)
  const n = quiz.cards_from_errors.session_count
  await expect(main(page).getByRole('link', { name: n === 1 ? 'Revisar o card agora' : `Revisar os ${n} agora` })).toHaveAttribute('href', `/revisar?scope=quiz:${seed.quizId}`)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([])
})

test('episódio: "Revisar os N do episódio" (5 card_ids, 1 apagado → 4) traz só esses cards', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  const podcast = (await apiCall(page, 'GET', `/podcasts/${seed.podcastId}`)).data
  expect(podcast.card_ids).toHaveLength(5)
  expect(podcast.cards_available).toBe(4)

  await gotoApp(page, '/podcasts')
  const row = main(page).getByRole('link', { name: `Revisar 4 cards do episódio ${F2.episode}` })
  await expect(row).toHaveAttribute('href', `/revisar?scope=podcast:${seed.podcastId}`)
  const session = sessionOf(page)
  await row.click()
  const body = await (await session).json()
  expect(body.session_count).toBe(4)
  expect(body.data).toHaveLength(4)
  expect(body.scope).toMatchObject({ type: 'podcast', label: F2.episode })
})

test('axe claro e escuro em /revisar com recorte, 390 e 1440 px', async ({ page }) => {
  await gotoApp(page, '/hoje')
  const seed = await ensureF2Seed(page)
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
      await gotoApp(page, `/revisar?scope=document:${seed.aheadDocId}&ahead=1`)
      await expect(page.getByTestId('review-scope')).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      for (const v of results.violations) console.log(`[axe f2 ${width} ${theme}] ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
      expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id} (${v.nodes.length})`)).toEqual([])
    }
  }
})
