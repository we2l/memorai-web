import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, USERS } from './support/fixtures'

/**
 * Revisão E2 (prd-visual-e2 Fase 2, tasks 11.4): the answer band with the dolphin after each rating ("Lembrei" goes on
 * by itself in 1.2 s, "Não lembrei" waits), the "Por quê?" only on a miss (the explanation is mocked at POST /chat,
 * the generation route, with the API's contract) and the end of a lote in one gesture, at 390 and 1440 px. Own user
 * (`revisaoE2`, Pro, 2 buttons, lote of 10); no real AI.
 */
test.use({ auditUser: 'revisaoE2' })

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.revisaoE2.email}')->firstOrFail(); ${code}`)

async function dueTopic(page: Page, n: number) {
  const t = (await apiCall(page, 'POST', '/topics', { name: `E2 ${uid()}` })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: n }, (_, i) => ({ front: `Pergunta ${i + 1}`, back: `Resposta ${i + 1}` })) })
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${t.id}')->update(['state' => 'review', 'due' => now(), 'last_review' => now()->subDays(12), 'reps' => 3, 'stability' => 12, 'difficulty' => 5, 'scheduled_days' => 11]); echo 'ok';`)
  return t.id as string
}

const WHY = {
  data: {
    conversation_id: 'conv-e2e',
    message: { role: 'assistant', content: 'Porque a **resposta** vem do material.\n\nPara lembrar: releia o trecho.' },
    sources: [{ label: 'Apostila.pdf', page: 12, note_id: null, document_id: null }],
  },
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', review_batch_size: 10, review_buttons: 'two' })
})

for (const width of [390, 1440]) {
  test(`${width} px: faixa do acerto segue em 1,2 s, a do erro espera e abre o "Por quê?"; fim do lote num gesto`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const whyBodies: unknown[] = []
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      whyBodies.push(route.request().postDataJSON())
      await route.fulfill({ json: WHY })
    })
    // 11 cards: the lote of 10 is not the last one (the last ends with the session)
    const topicId = await dueTopic(page, 11)
    await gotoApp(page, `/revisar?topic_id=${topicId}`)

    // Hit: the band (green, celebrating) and the next card by itself in ~1.2 s, no click
    const front = page.getByTestId('review-front')
    const first = (await front.innerText()).trim()
    await page.getByTestId('review-show').click()
    await page.getByTestId('rate-3').click()
    const band = page.getByTestId('review-feedback')
    await expect(band).toHaveAttribute('data-kind', 'ok')
    await expect(band.locator('img')).toHaveAttribute('src', /celebrating/)
    await expect(page.getByTestId('review-why')).toHaveCount(0)
    await expect(front).toHaveText(first) // the rated card stays under the band
    await expect(band).toHaveCount(0, { timeout: 2500 })
    await expect(front).not.toHaveText(first)
    const second = (await front.innerText()).trim()

    // Miss: amber, thinking, waits; "Por quê?" (P) explains from the material
    await page.getByTestId('review-show').click()
    await page.getByTestId('rate-1').click()
    await expect(band).toHaveAttribute('data-kind', 'again')
    await expect(band.locator('img')).toHaveAttribute('src', /thinking/)
    await page.waitForTimeout(1600)
    await expect(band).toBeVisible()
    await page.keyboard.press('p')
    await expect(page.getByTestId('review-why-text')).toHaveText('Porque a resposta vem do material.')
    await expect(page.getByTestId('review-why-remember')).toContainText('releia o trecho.')
    await expect(page.getByTestId('review-why-sources')).toContainText('Apostila.pdf, p. 12')
    expect(whyBodies).toEqual([expect.objectContaining({ intent: 'why' })])
    if (width >= 1024) await expect(page.getByTestId('review-why-panel')).toBeVisible()
    else await page.keyboard.press('Escape')
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map(v => v.id)).toEqual([])
    await expect(front).toHaveText(second)
    await page.getByTestId('review-continue').click()
    await expect(front).not.toHaveText(second)

    // Enter skips the wait; the rest of the lote with the keyboard
    for (let i = 3; i <= 10; i++) {
      await page.keyboard.press('Space')
      await page.keyboard.press('2')
      await expect(band).toBeVisible()
      await page.keyboard.press('Enter')
    }

    // End of the lote: the primary is clickable from the first frame (never animates)
    const end = page.getByTestId('review-batch-end')
    await expect(end).toBeVisible()
    await expect(page.getByTestId('batch-next')).toBeEnabled()
    await expect(end.locator('h1')).toHaveText('Bom trabalho, Ana!')
    await expect(page.getByTestId('batch-remembered')).toHaveText('Você lembrou 9 de 10')
    await expect(page.getByTestId('batch-errors')).toHaveText('Reforçar o 1 que errei')
    await expect(page.getByTestId('ui-arc')).toHaveAttribute('data-got', '9')
    // The lote just finished counts in the goal of the day (Fase 2b: never "0 de 2" after a lote)
    await expect(page.getByTestId('batch-goal')).toContainText(/1\s*de 2/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

test('movimento reduzido: a faixa aparece sem subir e o acerto ainda segue sozinho', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const topicId = await dueTopic(page, 3)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await page.getByTestId('review-show').click()
  await page.getByTestId('rate-3').click()
  const band = page.getByTestId('review-feedback')
  await expect(band).toBeVisible()
  expect(await band.evaluate(el => getComputedStyle(el).animationName)).toMatch(/fb-fade/)
  await expect(band).toHaveCount(0, { timeout: 2500 })
})
