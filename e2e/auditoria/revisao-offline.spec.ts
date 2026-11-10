import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, sql, continueBand } from './support/fixtures'

/**
 * Revisão offline (prd-revisao-offline): the network drops in the middle of a lote and comes back; the installed app
 * opens /revisar without network from the service worker's app shell and the saved lot. Real IndexedDB, real service
 * worker of the production build, real API: the ratings must reach the server once, at the time they were answered.
 */
test.use({ auditUser: 'offline' })

const reviewsOf = (topicId: string) => Number(sql(`SELECT count(*) FROM reviews r JOIN flashcards f ON f.id = r.flashcard_id WHERE f.topic_id = '${topicId}'`))

/** A caderno with `n` cards already studied and due (a minute ago: due has second precision and Postgres rounds now()). */
async function dueTopic(page: Page, n: number) {
  const t = (await apiCall(page, 'POST', '/topics', { name: `Offline ${uid()}` })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: n }, (_, i) => ({ front: `Pergunta ${i + 1}`, back: `Resposta ${i + 1}` })) })
  sql(`UPDATE flashcards SET state = 'review', due = now() - interval '1 minute', last_review = now() - interval '12 days', reps = 3, stability = 12, difficulty = 5, scheduled_days = 11 WHERE topic_id = '${t.id}'`)
  return t.id as string
}

async function rate(page: Page, key: '1' | '2') {
  await expect(page.getByTestId('review-show')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-ratings')).toBeVisible()
  await page.keyboard.press(key)
  await continueBand(page)
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', review_batch_size: 10, review_buttons: 'two' })
})

test('a rede cai no meio do lote: segue revisando, a faixa diz o que falta e tudo sobe ao voltar', async ({ page, context }) => {
  const topicId = await dueTopic(page, 4)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await rate(page, '2')
  await expect.poll(() => reviewsOf(topicId)).toBe(1)

  await context.setOffline(true)
  await rate(page, '2')
  await rate(page, '1') // "Não lembrei" without network comes back at the end (D7)
  const bar = page.getByTestId('offline-bar')
  await expect(bar).toContainText('Sem internet: suas revisões ficam salvas')
  await expect(page.getByTestId('offline-pending')).toHaveText('2 avaliações para enviar.')
  await rate(page, '2')
  expect(reviewsOf(topicId)).toBe(1)

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText('Avaliações sincronizadas.')).toBeVisible({ timeout: 10_000 })
  await expect(bar).toHaveCount(0)
  expect(reviewsOf(topicId)).toBe(4)
  // Each rating once, at the time it was answered (the device clock is the server's here)
  expect(Number(sql(`SELECT count(DISTINCT r.client_id) FROM reviews r JOIN flashcards f ON f.id = r.flashcard_id WHERE f.topic_id = '${topicId}' AND r.applied`))).toBe(4)
})

test('o app instalado abre a revisão sem rede pelo lote salvo e sincroniza depois', async ({ page, context }) => {
  const topicId = await dueTopic(page, 3)
  // Online once: the service worker installs (precache with the app shell) and the lot of this slice is saved
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect(page.getByTestId('review-show')).toBeVisible()
  await page.waitForTimeout(500) // IndexedDB write of the lot
  await gotoApp(page, '/hoje')

  await context.setOffline(true)
  await page.goto(`/revisar?topic_id=${topicId}`)
  await expect(page.getByTestId('offline-bar')).toContainText('Sem internet')
  await rate(page, '2')
  await rate(page, '2')
  await expect(page.getByTestId('offline-pending')).toHaveText('2 avaliações para enviar.')

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(() => reviewsOf(topicId), { timeout: 10_000 }).toBe(2)
  // The queue of IndexedDB is empty for this account
  const left = await page.evaluate(() => new Promise<number>((resolve) => {
    const req = indexedDB.open('baigi-offline')
    req.onsuccess = () => {
      const tx = req.result.transaction('queue', 'readonly').objectStore('queue').count()
      tx.onsuccess = () => resolve(tx.result)
    }
  }))
  expect(left).toBe(0)
})
