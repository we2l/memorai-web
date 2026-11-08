import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, USERS } from './support/fixtures'

/**
 * Revisão v5, Fase B (prd-revisao-v5-fase-b): the backlog apart from today with "Recuperar em N dias" and the paused new
 * cards (the numbers of the Hoje, the caderno and the session stay equal), Certo/Errado, the typed answer and the leech
 * with "Pausar o card". Own user (`faseB`, reset on each run); no AI; nothing mocked.
 */
test.use({ auditUser: 'faseB' })

const php = (code: string) => tinker(`$u = App\\Domain\\User\\Models\\User::where('email', '${USERS.faseB.email}')->firstOrFail(); ${code}`)

/** A caderno with `n` cards, set with the attributes given (raw SQL: no model events). */
async function topicWith(page: Page, n: number, attrs: string) {
  const t = (await apiCall(page, 'POST', '/topics', { name: `Fase B ${uid()}` })).data
  await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.id, cards: Array.from({ length: n }, (_, i) => ({ front: `Pergunta ${i + 1}`, back: `Resposta ${i + 1}` })) })
  php(`Illuminate\\Support\\Facades\\DB::table('flashcards')->where('topic_id', '${t.id}')->update([${attrs}]); App\\Support\\Services\\UserCacheVersion::bump($u->id); echo 'ok';`)
  return t.id as string
}

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  await apiCall(page, 'PUT', '/settings', { error_diary_mode: 'never', review_batch_size: 20, pause_new_on_backlog: true })
  php(`App\\Domain\\Flashcard\\Models\\Flashcard::where('user_id', $u->id)->forceDelete(); $u->forceFill(['backlog_plan_days' => null, 'backlog_plan_started_on' => null, 'backlog_plan_total' => null])->save(); echo 'ok';`)
})

test('atraso: fora do "Revisar hoje", plano de 7 dias e os mesmos números no Hoje, no caderno e na sessão', async ({ page }) => {
  const late = await topicWith(page, 60, `'state' => 'review', 'due' => now()->subDays(4), 'last_review' => now()->subDays(20), 'reps' => 3, 'stability' => 6, 'difficulty' => 5`)
  await topicWith(page, 3, `'state' => 'review', 'due' => now(), 'last_review' => now()->subDays(5), 'reps' => 3, 'stability' => 5, 'difficulty' => 5`)

  await gotoApp(page, '/hoje')
  const step = page.getByTestId('plan-step-review')
  await expect(step).toContainText('Revisar 3 cards')
  await expect(step.getByTestId('backlog-line-overdue')).toContainText('Atraso: 60 cards · Recuperar em dias')
  await expect(step.getByTestId('backlog-line-paused')).toBeVisible()

  await step.getByTestId('backlog-line-open').click()
  const sheet = page.getByTestId('backlog-sheet')
  await expect(sheet.getByRole('radio', { name: /7 dias/ })).toBeChecked()
  await expect(sheet).toContainText('~9 por dia, além dos de hoje')
  await page.getByTestId('backlog-start').click()
  await expect(step.getByTestId('backlog-line-plan')).toContainText('Recuperando o atraso · dia 1 de 7 · faltam 60')
  await expect(step).toContainText('Revisar 12 cards')

  const stats = (await apiCall(page, 'GET', '/stats')).data
  const session = await apiCall(page, 'GET', '/review/session')
  expect(stats.due_today).toBe(12)
  expect(session.session_count).toBe(12)
  await gotoApp(page, `/cadernos/${late}`)
  await expect(page.getByTestId('scope-review')).toContainText('Revisar hoje · 9')
  await expect(page.getByTestId('backlog-line-plan')).toContainText('dia 1 de 7')

  // "Cancelar o plano": the cards get their day back and the backlog line returns
  await page.getByTestId('backlog-line-open').click()
  await page.getByTestId('backlog-cancel').click()
  await expect(page.getByTestId('backlog-line-overdue')).toContainText('Atraso neste caderno: 60 cards')
})

test('Certo/Errado com C/E/B, digitar com diff e "Contar como certo", leech com "Pausar o card"', async ({ page }) => {
  const topic = await topicWith(page, 3, `'state' => 'review', 'due' => now(), 'last_review' => now()->subDays(8), 'reps' => 3, 'stability' => 8, 'difficulty' => 5`)
  php(`$ids = App\\Domain\\Flashcard\\Models\\Flashcard::where('topic_id', '${topic}')->orderBy('front')->pluck('id');
    App\\Domain\\Flashcard\\Models\\Flashcard::whereKey($ids[0])->update(['answer_check' => 'true_false', 'check_answer' => 'errado', 'due' => now()->subMinutes(3)]);
    App\\Domain\\Flashcard\\Models\\Flashcard::whereKey($ids[1])->update(['answer_check' => 'typed', 'back' => 'to borrow', 'due' => now()->subMinutes(2)]);
    App\\Domain\\Flashcard\\Models\\Flashcard::whereKey($ids[2])->update(['lapses' => 5, 'due' => now()->subMinute()]); echo 'ok';`)
  const sent: Record<string, unknown>[] = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/review')) sent.push(JSON.parse(r.postData() ?? '{}')) })

  await gotoApp(page, `/revisar?topic_id=${topic}`)
  await expect(page.getByTestId('review-check')).toHaveAttribute('data-mode', 'true_false')
  await page.keyboard.press('Space') // no turn: the answer comes first
  await expect(page.getByTestId('review-answer')).toHaveCount(0)
  await page.keyboard.press('b')
  await expect(page.getByTestId('check-result')).toHaveText('Em branco · Gabarito: Errado')
  await page.keyboard.press('Enter')

  await expect(page.locator('[data-mode=typed]')).toBeVisible()
  await page.getByTestId('check-input').fill('borrow')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('check-diff')).toContainText('faltou: to')
  await page.getByTestId('check-count-right').click()

  await page.getByTestId('review-show').click()
  await expect(page.getByTestId('review-leech')).toContainText('Esse card não está colando (5 erros)')
  await page.getByTestId('leech-pause').click()
  await expect(page.getByText('Card pausado.')).toBeVisible()

  await expect.poll(() => sent.length).toBe(2)
  expect(sent[0]).toMatchObject({ rating: 1, answer_mode: 'true_false', answer_outcome: 'blank' })
  expect(sent[1]).toMatchObject({ rating: 3, answer_mode: 'typed', answer_outcome: 'correct', typed_match: false })
  const paused = (await apiCall(page, 'GET', `/topics/${topic}/flashcards?state=suspended&limit=5`)).data
  expect(paused).toHaveLength(1)
})
