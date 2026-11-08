import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, USERS } from './support/fixtures'

/**
 * Revisão v5, Fase A (prd-revisao-v5-fase-a §3.2): "Não lembrei / Lembrei" by default (Again = 1, Good = 3), the 4
 * Anki buttons as an option in Configurações, the keys of the binary, the ratings only with the answer on screen, no
 * tap-to-turn on a phone, the pill after each rating and the end of a lote with memory (cards back only in a week or
 * more, "Dia N da sequência" and the weekly rest). Own user (`binario`, 2 buttons); no AI; nothing mocked.
 */
test.use({ auditUser: 'binario' })

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.binario.email}')->firstOrFail(); ${code}`)
const cardFace = (page: Page) => page.getByTestId('review-card')

/** A caderno with `n` cards already studied, due now and stable (a "Lembrei" sends them weeks away). */
async function dueTopic(page: Page, n: number) {
  const t = (await apiCall(page, 'POST', '/topics', { name: `Botões ${uid()}` })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: n }, (_, i) => ({ front: `Pergunta ${i + 1}`, back: `Resposta ${i + 1}` })) })
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${t.id}')->update(['state' => 'review', 'due' => now(), 'last_review' => now()->subDays(12), 'reps' => 3, 'stability' => 12, 'difficulty' => 5, 'scheduled_days' => 11]); echo 'ok';`)
  return t.id as string
}

function ratingsSent(page: Page) {
  const sent: number[] = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/review')) sent.push(JSON.parse(r.postData() ?? '{}').rating) })
  return sent
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', review_batch_size: 10, review_buttons: 'two' })
})

test('dois botões: verso antes de avaliar, teclas 1/2/←/→/Espaço, a pílula a cada avaliação e nenhum toast', async ({ page }) => {
  const topicId = await dueTopic(page, 6)
  const sent = ratingsSent(page)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)

  // No rating before the answer: neither the buttons nor the keys
  await expect(page.getByTestId('review-ratings')).toHaveCount(0)
  await page.keyboard.press('2')
  await page.waitForTimeout(300)
  expect(sent).toEqual([])
  await expect(page.getByTestId('review-keys')).toHaveText(/1 Não lembrei · 2 ou Espaço Lembrei/)

  await page.keyboard.press('Space')
  const ratings = page.getByTestId('review-ratings')
  await expect(ratings).toHaveAttribute('data-mode', 'two')
  await expect(ratings.getByRole('button')).toHaveText([/Não lembrei/, /Lembrei/])
  await expect(page.getByTestId('rate-3')).toHaveAttribute('data-variant', 'primary')
  await expect(page.getByTestId('rate-1')).toHaveAttribute('data-variant', 'secondary')
  await page.keyboard.press('3') // the 4-button key does nothing in the binary
  await page.waitForTimeout(200)
  expect(sent).toEqual([])
  await page.keyboard.press('2')
  await expect(page.getByTestId('review-feedback')).toHaveText(/Lembrei · volta em /)
  await expect(page.getByTestId('review-feedback')).toHaveAttribute('data-remembered', 'true')

  for (const key of ['1', 'ArrowLeft', 'ArrowRight', 'Space']) {
    await expect(page.getByTestId('review-show')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(ratings).toBeVisible()
    // The pill of the previous card leaves when this one turns (never next to its answer)
    await expect(page.getByTestId('review-feedback')).toHaveCount(0)
    await page.keyboard.press(key)
  }
  await expect(page.getByTestId('review-feedback')).toContainText('Lembrei')
  await expect.poll(() => sent).toEqual([3, 1, 1, 3, 3])
  // The reward lives in the pill and at the end of the lote, never in a toast per rating
  await expect(page.locator('.z-toast').getByText(/lembrei|volta/i)).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
})

test('fim do lote com memória: lembrou X de N, os que só voltam daqui a 1 semana, Dia N e a folga', async ({ page }) => {
  const topicId = await dueTopic(page, 11)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('review-show')).toBeVisible()
    await page.keyboard.press('Space')
    await page.keyboard.press(i === 0 ? '1' : '2')
  }
  const end = page.getByTestId('review-batch-end')
  await expect(end).toBeVisible({ timeout: 15_000 })
  await expect(end).toContainText('Você lembrou 9 de 10')
  await expect(end.getByTestId('batch-far')).toContainText('9só voltam daqui a 1 semana ou mais')
  await expect(end).not.toContainText('%')
  await expect(end.getByTestId('batch-streak')).toContainText('Dia 1 da sequência')
  await expect(end.getByTestId('streak-rest')).toHaveText('Você tem 1 dia de folga por semana sem perder a sequência.')
  await expect(page.getByTestId('review-feedback')).toHaveCount(0)
})

test('os 4 botões como opção: Configurações → Estudo grava, e a revisão volta a De novo · Difícil · Bom · Fácil', async ({ page }) => {
  await gotoApp(page, '/configuracoes#estudo')
  const picker = page.getByTestId('review-buttons')
  await expect(picker.getByRole('radio', { name: /Lembrei \/ Não lembrei/ })).toBeChecked()
  await picker.getByRole('radio', { name: /4 botões, como no Anki/ }).check()
  await expect(page.getByTestId('review-buttons-saved')).toHaveText('Salvo')

  const topicId = await dueTopic(page, 2)
  const sent = ratingsSent(page)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-ratings')).toHaveAttribute('data-mode', 'four')
  await expect(page.getByTestId('review-ratings').getByRole('button')).toHaveText([/De novo/, /Difícil/, /Bom/, /Fácil/])
  await expect(page.getByTestId('review-keys')).toHaveText(/1 2 3 4 · Espaço mostrar/)
  await page.keyboard.press('2')
  await expect(page.getByTestId('review-feedback')).toHaveText(/Difícil · volta em/)
  await expect.poll(() => sent).toEqual([2])
  // Next card turned: the pill of the previous one is gone (prd-revisao-v5-fase-b)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-ratings')).toBeVisible()
  await expect(page.getByTestId('review-feedback')).toHaveCount(0)
})

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('tocar no card não vira; só o botão "Mostrar resposta"; sem a dica de teclado', async ({ page }) => {
    const topicId = await dueTopic(page, 1)
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    await cardFace(page).tap()
    await page.waitForTimeout(300)
    await expect(page.getByTestId('review-answer')).toHaveCount(0)
    await expect(page.getByTestId('review-keys')).toBeHidden()
    await page.getByTestId('review-show').tap()
    await expect(page.getByTestId('review-answer')).toBeVisible()
    await expect(page.getByTestId('review-ratings').getByRole('button')).toHaveText([/Não lembrei/, /Lembrei/])
    const box = await page.getByTestId('rate-3').boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
