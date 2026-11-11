import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, USERS, continueBand } from './support/fixtures'

/**
 * Revisão v3 (prd-4d-revisao-v3 §9, tasks 10.1): batches of 20 with a visible end, the origin of the card
 * (PDF, note, quiz question, none), "Abrir o trecho" and back, the celebration (once a day for the goal,
 * still with reduced motion), the same order of the 4 ratings on every screen, the account without cards and
 * the retention suggestion at the end of the session. Own users; no AI; nothing mocked on the persistence
 * routes (the reads /stats and /review/retention-suggestion are answered by the test only where a state of
 * the account cannot be produced otherwise).
 */
test.use({ auditUser: 'revisao' })

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.revisao.email}')->firstOrFail(); ${code}`)
const cardFace = (page: Page) => page.getByTestId('review-card')
const top = (page: Page) => page.getByTestId('review-batch')
/** The E2 bar: the "Lote N de M" tag, then "card X de Y" (no separator in the text since prd-visual-e2) */
const batchText = (lote: number, lotes: number, card: number, size: number) => new RegExp(`Lote ${lote} de ${lotes}\\s*·?\\s*card ${card} de ${size}`)

/** A caderno with `n` cards already studied and due now (new cards would stop at the 20 new of the day). */
async function dueTopic(page: Page, n: number, prefix = 'Pergunta') {
  const t = (await apiCall(page, 'POST', '/topics', { name: `Revisão v3 ${uid()}` })).data
  for (let done = 0; done < n; done += 100) {
    const size = Math.min(100, n - done)
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: size }, (_, i) => ({ front: `${prefix} ${done + i + 1}`, back: `Resposta ${done + i + 1}` })) })
  }
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${t.id}')->update(['state' => 'review', 'due' => now(), 'last_review' => now()->subDays(4), 'reps' => 2, 'stability' => 4, 'difficulty' => 5, 'scheduled_days' => 3]); echo 'ok';`)
  return t.id as string
}

/** Rates the card on screen with the keyboard (Espaço shows, the digit rates). */
async function rate(page: Page, key: '1' | '2' | '3' | '4' = '3') {
  await expect(page.getByTestId('review-show')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-ratings')).toBeVisible()
  await page.keyboard.press(key)
  // The answer band (prd-visual-e2 RF-2.4): a hit goes on in 1.2 s, a miss waits for "Continuar"
  await continueBand(page)
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  // The diary would stop the flow after a "De novo"; the tests that need it set it themselves
  await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', session_time_limit: null })
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e-clean')) { sessionStorage.setItem('e2e-clean', '1'); for (const k of Object.keys(localStorage)) if (k.startsWith('baigi-goal-celebrated-')) localStorage.removeItem(k) } } catch {} })
})

test('lotes de 20 com fim visível: "Lote 1 de 3", o fim do lote e "Próximo lote" seguem até o fim da sessão', async ({ page }) => {
  const topicId = await dueTopic(page, 45)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await expect(top(page)).toContainText(batchText(1, 3, 1, 20))
  for (let i = 0; i < 20; i++) await rate(page, '3')
  const end = page.getByTestId('review-batch-end')
  await expect(end.getByRole('heading', { level: 1 })).toHaveText(/^(Bom trabalho|Meta feita)/)
  await expect(end).toContainText('Você lembrou 20 de 20')
  await expect(page.getByTestId('review-announce')).toHaveText('Lote 1 concluído, 20 de 20 lembrados.')
  await expect(end.getByTestId('batch-goal')).toContainText(/\d+\s*de \d+\s*Lotes? da meta/)
  await expect(page.getByTestId('review-footer')).toHaveCount(0)
  // Enter = "Próximo lote"
  await page.keyboard.press('Enter')
  await expect(top(page)).toContainText(batchText(2, 3, 1, 20))
  for (let i = 0; i < 20; i++) await rate(page, '3')
  await expect(end).toContainText('Próximo lote · 5 cards')
  await end.getByTestId('batch-next').click()
  await expect(top(page)).toContainText(batchText(3, 3, 1, 5))
  for (let i = 0; i < 5; i++) await rate(page, '3')
  // The last batch ends with the session: no "Próximo lote"
  const sessionEnd = page.getByTestId('review-session-end')
  await expect(sessionEnd).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('batch-next')).toHaveCount(0)
  await expect(sessionEnd.getByTestId('session-stats')).toContainText('45')
})

test('card de aprendizagem que volta não conta outra vez no lote', async ({ page }) => {
  const topicId = await dueTopic(page, 21)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await rate(page, '1') // De novo: it comes back later
  for (let i = 0; i < 19; i++) await rate(page, '3')
  const end = page.getByTestId('review-batch-end')
  await expect(end).toContainText('Você lembrou 19 de 20')
  await expect(end.getByTestId('batch-next')).toHaveText('Próximo lote · 2 cards')
  await end.getByTestId('batch-next').click()
  await expect(top(page)).toContainText('Lote 2 de 2')
  await rate(page, '3') // the 21st card
  await rate(page, '3') // the one in learning, back: not a new card of the batch
  await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('session-stats')).toContainText('21')
  await expect(page.getByTestId('review-batch-end')).toHaveCount(0)
})

test('meta cumprida no lote celebra uma vez por dia e grava a chave compartilhada com o Hoje', async ({ page }) => {
  const topicId = await dueTopic(page, 41)
  // The goal of the account at the start and after the batch (a read): not met, then met
  let met = false
  await page.route(/\/api\/stats$/, async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.data.goal = { batch_size: 20, target_batches: 1, done_batches: met ? 1 : 0, met, minutes_left: met ? 0 : 7 }
    await route.fulfill({ response: res, json: body })
  })
  // Hoje may have celebrated the goal of an empty account already: this test starts with the day clean
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('baigi-goal-celebrated-')) localStorage.removeItem(k) })
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  for (let i = 0; i < 19; i++) await rate(page, '3')
  met = true
  await rate(page, '3')
  const end = page.getByTestId('review-batch-end')
  await expect(end).toHaveAttribute('data-kind', 'goal')
  await expect(end.getByRole('heading', { level: 1 })).toHaveText(/^Meta feita/)
  const key = await page.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('baigi-goal-celebrated-')))
  expect(key).toBeTruthy()
  await end.getByTestId('batch-next').click()
  for (let i = 0; i < 20; i++) await rate(page, '3')
  await expect(end).toHaveAttribute('data-kind', 'batch')
  await expect(end.getByRole('heading', { level: 1 })).toHaveText(/^Bom trabalho/)
})

test('celebração ≤ 700 ms; com movimento reduzido, nenhuma animação', async ({ page }) => {
  const topicId = await dueTopic(page, 42)
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  for (let i = 0; i < 20; i++) await rate(page, '3')
  // The dolphin leads the gesture (ADR-035 §6: 520 ms)
  const mascot = page.getByTestId('review-batch-end').locator('picture').first()
  const ms = await mascot.evaluate(el => parseFloat(getComputedStyle(el).animationDuration) * 1000)
  expect(ms).toBeGreaterThan(0)
  expect(ms).toBeLessThanOrEqual(700)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByTestId('batch-next').click()
  for (let i = 0; i < 20; i++) await rate(page, '3')
  const end = page.getByTestId('review-batch-end')
  await expect(end).toBeVisible()
  const animated = await end.evaluate(el => [...el.querySelectorAll('*')].filter(n => getComputedStyle(n).animationName !== 'none' && parseFloat(getComputedStyle(n).animationDuration) > 0.01).length)
  expect(animated).toBe(0)
})

test('origem nos 3 tipos (PDF com parte, nota, questão) e nada no card avulso', async ({ page }) => {
  const topic = (await apiCall(page, 'POST', '/topics', { name: `Origem ${uid()}` })).data
  const pdfNote = (await apiCall(page, 'POST', `/topics/${topic.id}/notes`, { title: 'Apostila O (resumo)' })).data
  const note = (await apiCall(page, 'POST', `/topics/${topic.id}/notes`, { title: 'Resumo de remédios' })).data
  php(`$d = App\\Domain\\Agent\\Models\\Document::create(['user_id' => $u->id, 'topic_id' => '${topic.id}', 'filename' => 'o.pdf', 'original_name' => 'Apostila O.pdf', 'file_path' => 'e2e/sem-arquivo.pdf', 'file_size' => 1024, 'pages_count' => 9, 'processed_pages' => 9, 'status' => 'completed', 'note_generation_status' => 'completed']); Illuminate\\Support\\Facades\\DB::table('notes')->where('id', '${pdfNote.id}')->update(['source_document_id' => $d->id]); echo 'ok';`)
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.id, note_id: pdfNote.id, cards: [{ front: 'Origem PDF?', back: 'R' }] })
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.id, note_id: note.id, cards: [{ front: 'Origem nota?', back: 'R' }] })
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.id, cards: [{ front: 'Origem questão?', back: 'R' }, { front: 'Origem nenhuma?', back: 'R' }] })
  php(`
    $c = App\\Domain\\Flashcard\\Models\\Flashcard::where('topic_id', '${topic.id}')->where('front', 'Origem questão?')->firstOrFail();
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${topic.id}', 'title' => 'Simulado O', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => 7, 'types' => ['true_false'], 'difficulty' => 'mixed'], 'total_questions' => 7, 'correct_count' => 6, 'score_percent' => 85, 'time_spent_seconds' => 60, 'started_at' => now()->subMinute(), 'completed_at' => now()]);
    foreach (range(1, 7) as $pos) { App\\Domain\\Quiz\\Models\\QuizQuestion::create(['quiz_id' => $q->id, 'position' => $pos, 'type' => 'true_false', 'difficulty' => 'easy', 'stem' => "Afirmação $pos", 'explanation' => 'x', 'correct_answer' => 'true', 'user_answer' => $pos === 7 ? 'false' : 'true', 'is_correct' => $pos !== 7, 'answered_at' => now(), 'flashcard_id' => $pos === 7 ? $c->id : null]); }
    Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${topic.id}')->update(['state' => 'review', 'due' => now(), 'last_review' => now()->subDays(4), 'reps' => 3, 'lapses' => 2, 'stability' => 4, 'difficulty' => 5, 'scheduled_days' => 3]);
    echo 'ok';
  `)
  await gotoApp(page, `/revisar?topic_id=${topic.id}`)
  const seen: Record<string, string> = {}
  for (let i = 0; i < 4; i++) {
    const front = (await cardFace(page).getByTestId('review-front').innerText()).trim()
    await page.keyboard.press('Space')
    const origin = page.getByTestId('review-origin')
    seen[front] = (await origin.count()) ? await origin.innerText() : ''
    await page.keyboard.press('3')
    await continueBand(page)
  }
  expect(seen['Origem PDF?']).toContain('Origem: Apostila O')
  expect(seen['Origem PDF?']).toContain('Abrir o trecho')
  expect(seen['Origem nota?']).toContain('Origem: Resumo de remédios')
  expect(seen['Origem nota?']).toContain('Abrir a nota')
  expect(seen['Origem questão?']).toContain('questão 7 do Simulado O')
  expect(seen['Origem questão?']).toContain('Ver a questão')
  expect(seen['Origem nenhuma?']).not.toContain('Origem:')
  // lapses ≥ 2 is said on every card that has it
  expect(seen['Origem nenhuma?']).toContain('Você errou este card 2 vezes')
})

test('"Abrir o trecho" (tecla O) leva ao material e "Voltar à revisão" retoma sem repetir o card avaliado', async ({ page }) => {
  const topic = (await apiCall(page, 'POST', '/topics', { name: `Trecho ${uid()}` })).data
  const note = (await apiCall(page, 'POST', `/topics/${topic.id}/notes`, { title: 'Nota do trecho' })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.id, note_id: note.id, cards: [{ front: 'Trecho A?', back: 'R' }, { front: 'Trecho B?', back: 'R' }, { front: 'Trecho C?', back: 'R' }] })
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${topic.id}')->update(['state' => 'review', 'due' => now(), 'last_review' => now()->subDays(4), 'reps' => 2, 'stability' => 4, 'difficulty' => 5, 'scheduled_days' => 3]); echo 'ok';`)
  await gotoApp(page, `/revisar?topic_id=${topic.id}`)
  const rated = (await cardFace(page).getByTestId('review-front').innerText()).trim()
  await rate(page, '4')
  await expect(cardFace(page).getByTestId('review-front')).not.toHaveText(rated)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-origin-link')).toHaveText(/Abrir a nota/)
  // The rating went out while the band was up (prd-visual-e2 RF-2.4): nothing to wait for here
  await page.keyboard.press('o')
  await expect(page).toHaveURL(new RegExp(`/material/${note.id}\\?from=review`))
  const back = page.getByTestId('material-back')
  await expect(back).toHaveAccessibleName('Voltar à revisão')
  await back.click()
  await expect(page).toHaveURL(new RegExp(`/revisar\\?topic_id=${topic.id}`))
  await expect(cardFace(page)).toBeVisible()
  for (let i = 0; i < 2; i++) {
    await expect(cardFace(page).getByTestId('review-front')).not.toHaveText(rated)
    await rate(page, '4')
  }
  await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 15_000 })
})

test('os 4 botões na mesma ordem e numa linha no celular e no desktop; toque no card vira', async ({ page }) => {
  const topicId = await dueTopic(page, 2)
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await gotoApp(page, `/revisar?topic_id=${topicId}`)
    await cardFace(page).click()
    const buttons = page.getByTestId('review-ratings').getByRole('button')
    await expect(buttons).toHaveCount(4)
    const labels = await buttons.evaluateAll(els => els.map(e => e.textContent!.replace(/\s+/g, ' ').trim()))
    expect(labels.map(l => l.replace(/^\d\s*/, ''))).toEqual([expect.stringMatching(/^De novo/), expect.stringMatching(/^Difícil/), expect.stringMatching(/^Bom/), expect.stringMatching(/^Fácil/)])
    const boxes = await buttons.evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => ({ y: Math.round(r.top), h: r.height, w: r.width })))
    expect(new Set(boxes.map(b => b.y)).size).toBe(1)
    for (const b of boxes) expect(b.h).toBeGreaterThanOrEqual(56)
    if (width === 390) {
      const footer = await page.getByTestId('review-footer').boundingBox()
      expect(footer!.y + footer!.height).toBeGreaterThanOrEqual(844 - 2)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    }
  }
})

test('sugestão de retenção no fim da sessão: "Agora não" responde ao servidor e some', async ({ page }) => {
  const topicId = await dueTopic(page, 1)
  // The account has no backlog to trigger it: the read is answered by the test, the dismiss is real
  await page.route(/\/api\/review\/retention-suggestion$/, r => r.fulfill({ json: { data: { has_suggestion: true, current_retention: 0.9, suggested_retention: 0.85, cards_eliminated: 312, overdue_count: 893 } } }))
  await gotoApp(page, `/revisar?topic_id=${topicId}`)
  await rate(page, '3')
  const hint = page.getByTestId('retention-hint')
  await expect(hint).toContainText('Você tem 893 atrasados. Baixar a meta de lembrança de 90% para 85% tira cerca de 312 da fila.')
  const dismiss = page.waitForResponse(r => r.url().endsWith('/api/review/retention-suggestion/dismiss'))
  await hint.getByTestId('retention-dismiss').click()
  expect((await dismiss).status()).toBe(204)
  await expect(hint).toHaveCount(0)
})

test.describe('Conta sem nenhum card', () => {
  test.use({ auditUser: 'revisaoEmpty' })
  test('"Você ainda não tem cards" com o primário que abre o "+ Adicionar" (nunca "Tudo em dia")', async ({ page }) => {
    await gotoApp(page, '/revisar')
    const empty = page.getByTestId('review-no-cards')
    await expect(empty.getByRole('heading', { name: 'Você ainda não tem cards' })).toBeVisible()
    await expect(page.getByText('Tudo em dia')).toHaveCount(0)
    await empty.getByRole('button', { name: 'Criar meus primeiros cards' }).click()
    await expect(page.getByRole('dialog', { name: /Adicionar/ })).toBeVisible()
  })
})

test.describe('Acessibilidade da revisão (axe)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1440, 390]) {
      test(`${width}px ${theme}: card, resposta com origem, fim do lote e fim da sessão sem violações serious/critical`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        await page.setViewportSize({ width, height: 900 })
        const check = async (what: string) => {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
          expect(bad.map(v => `${what}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
        }
        const topicId = await dueTopic(page, 21)
        await gotoApp(page, `/revisar?topic_id=${topicId}`)
        await check('card')
        await page.keyboard.press('Space')
        await check('resposta')
        await page.keyboard.press('3')
        await continueBand(page)
        for (let i = 0; i < 19; i++) await rate(page, '3')
        await expect(page.getByTestId('review-batch-end')).toBeVisible()
        await page.waitForTimeout(300)
        await check('fim do lote')
        await page.getByTestId('batch-next').click()
        await rate(page, '3')
        await expect(page.getByTestId('review-session-end')).toBeVisible({ timeout: 15_000 })
        await page.waitForTimeout(500)
        await check('fim da sessão')
      })
    }
  }
})
