import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, sql, USERS } from './support/fixtures'
import { ensurePraticarSeed, php, seedQuiz, type PraticarSeed } from './support/seed-praticar'

/**
 * Questões v3 (prd-4e-praticar-v3 §9, tasks 13.1): the worst assunto opens the sheet already filled; the quota
 * and the requirement before; a bateria answered only with the keyboard; "Saíram N de M" when the generation
 * comes short; the result by assunto; errors → cards chosen (in the assunto of each question); "Revisar os N
 * agora"; "Refazer as que errei" without quota; a network error on the result without an endless spinner.
 * No AI: the only mock is POST /quizzes (the generation), answered with a quiz written in the database; every
 * persistence route (answer, finish, create-cards, retry-errors) is the real one.
 */
test.use({ auditUser: 'praticar' })

let seed: PraticarSeed
test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  // The Free account has no seed (its own empty caderno only)
  if (!test.info().titlePath.includes('Free')) seed = await ensurePraticarSeed(page)
})

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Novas questões' })
const quizUsage = () => Number(sql(`select coalesce(sum(count), 0) from feature_usages where feature = 'quiz_ai' and user_id = (select id from users where email = '${USERS.praticar.email}')`))

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map(v => `${label}: ${v.id} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
}

test('Praticar: "20 questões do pior assunto" abre a folha já preenchida com o assunto e 20 questões', async ({ page }) => {
  await gotoApp(page, '/praticar')
  const quiz = page.getByTestId('practice-quiz')
  // The accuracy of all cadernos: 16 answered, 6 right
  await expect(quiz).toContainText('38%')
  await expect(quiz).toContainText('de acerto em 16 questões')
  await expect(quiz).toContainText('Constitucional · 40% de acerto')
  await quiz.getByTestId('practice-weak').click()
  await expect(sheet(page)).toBeVisible()
  await expect(sheet(page).getByTestId('quiz-scope')).toHaveValue(seed.constId)
  await expect(sheet(page).getByTestId('quiz-count')).toHaveValue('20')
  await expect(sheet(page).getByTestId('quiz-submit')).toHaveText('Gerar 20 questões')
  await axe(page, 'ConfigSheet bateria')
  // Simulado tab: the matéria keeps its scope (split by its assuntos); the caderno splits by matéria
  await sheet(page).getByRole('tab', { name: 'Simulado' }).click()
  await expect(sheet(page).getByTestId('quiz-distribution')).toContainText('Controle 60')
  await sheet(page).getByTestId('quiz-scope').selectOption(seed.rootId)
  await expect(sheet(page).getByTestId('quiz-distribution')).toContainText(/(Constitucional \d+ · Português \d+|Português \d+ · Constitucional \d+)/)
  await expect(sheet(page).getByTestId('quiz-submit')).toHaveText('Gerar simulado de 60')
  await axe(page, 'ConfigSheet simulado')
})

test.describe('Free', () => {
  test.use({ auditUser: 'praticarFree' })

  test('depois do teste: sem cota de IA ("Ver o …" com o nome do catálogo), "faltam N palavras" e o simulado do caderno no plano pago', async ({ page }) => {
    const empty = (await apiCall(page, 'POST', '/topics', { name: `Sem material ${Date.now()}` })).data
    const catalog = (await apiCall(page, 'GET', '/plans')).data
    const pro = catalog.plans.find((p: any) => p.key === 'pro').name
    await gotoApp(page, `/simulados?topic_id=${empty.id}`)
    await expect(sheet(page)).toBeVisible()
    await expect(sheet(page).getByTestId('quiz-quota')).toHaveCount(0)
    // With the preview of the AI (prd-uso-justo §9) the Free has 1 bateria of up to 10 questões, once per account;
    // without it, no AI: no "0 de 0", the action says where it is
    await expect(sheet(page).getByTestId('quiz-submit')).toHaveText(catalog.preview ? `Gerar ${catalog.preview.quiz_max_questions} questões` : `Ver o ${pro}`)
    // The preview's usage notice is a status too: the requirement is the one in the Bateria tab
    await expect(sheet(page).getByRole('tabpanel', { name: 'Bateria' }).getByRole('status')).toContainText('Escreva 100 palavras em notas para liberar')
    await expect(sheet(page).getByTestId('quiz-submit')).toBeDisabled()
    await expect(sheet(page).getByTestId('quiz-count').locator('option', { hasText: '50 questões' })).toBeDisabled()
    await sheet(page).getByRole('tab', { name: 'Simulado' }).click()
    await expect(sheet(page)).toContainText(`é do ${pro}`)
    await expect(sheet(page).getByTestId('quiz-submit')).toBeDisabled()
  })
})

test('bateria inteira só no teclado: 1–4/A–D escolhem, Enter confirma e segue, o resultado abre', async ({ page }) => {
  const quizId = seedQuiz('praticar', seed.ctrlId, 'Bateria do teclado', [[seed.ctrlId, true], [seed.ctrlId, true], [seed.ctrlId, true]], { status: 'in_progress' })
  await gotoApp(page, `/simulados/${quizId}`)
  await expect(page.getByTestId('quiz-topbar')).toContainText('Questão 1 de 3')
  await axe(page, 'responder')
  // Q1: "2" picks B (the right one), Enter confirms; Treino shows the correction; Enter goes on
  await page.keyboard.press('2')
  await expect(page.getByRole('radio', { name: 'Segunda' })).toBeChecked()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('quiz-feedback')).toContainText('Certo!')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('quiz-topbar')).toContainText('Questão 2 de 3')
  // Q2: "a" picks A (wrong): the correction says which one is right, in words
  await page.keyboard.press('a')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('quiz-feedback')).toContainText('Errado. A correta é B) Segunda.')
  await expect(page.getByTestId('quiz-feedback').getByRole('button', { name: 'Por que errei?' })).toBeVisible()
  // ← goes back (the answer stays), → comes back
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('quiz-topbar')).toContainText('Questão 1 de 3')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await page.keyboard.press('3')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('quiz-primary')).toHaveText('Ver resultado')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/simulados/${quizId}/resultado`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você acertou 1 de 3')
})

test('"Saíram 3 de 5": a falta da geração aparece no começo (POST /quizzes mockado na geração)', async ({ page }) => {
  const quizId = seedQuiz('praticar', seed.ctrlId, 'Bateria curta', [[seed.ctrlId, true], [seed.ctrlId, true], [seed.ctrlId, true]], { status: 'in_progress' })
  php('praticar', `App\\Domain\\Quiz\\Models\\Quiz::whereKey('${quizId}')->update(['config' => ['quantity' => 5, 'types' => ['multiple_choice'], 'difficulty' => 'mixed', 'shortfall' => 2]]); echo 'ok';`)
  await page.route(url => url.pathname === '/api/quizzes', route => (route.request().method() === 'POST'
    ? route.fulfill({ status: 202, json: { data: { id: quizId, status: 'configuring', total_questions: 5 } } })
    : route.fallback()))
  await gotoApp(page, `/simulados?topic_id=${seed.ctrlId}`)
  await sheet(page).getByTestId('quiz-submit').click()
  await expect(page).toHaveURL(new RegExp(`/simulados/${quizId}$`))
  await expect(page.getByTestId('quiz-shortfall')).toHaveText(/Saíram 3 de 5 questões/)
})

test('resultado por assunto: placar contra a última vez, tabela com histórico e um bloco tingido', async ({ page }) => {
  await gotoApp(page, `/simulados/${seed.quizId}/resultado`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você acertou 1 de 4')
  await expect(page.getByTestId('quiz-delta')).toContainText('−17 pontos em relação à última vez')
  const table = page.getByTestId('quiz-by-topic')
  await expect(table.getByRole('link', { name: 'Controle' }).first()).toHaveAttribute('href', `/cadernos/${seed.ctrlId}`)
  await expect(table.locator('table')).toContainText('1 de 2')
  // The history is the API's (accuracy of the assunto without this quiz, ≥ 10 answered)
  const api = (await apiCall(page, 'GET', `/quizzes/${seed.quizId}`)).data
  const ctrl = api.by_topic.find((r: any) => r.topic_id === seed.ctrlId)
  expect(ctrl.history_accuracy).not.toBeNull()
  await expect(table.locator('table tr', { hasText: 'Controle' })).toContainText(`${ctrl.history_accuracy}%`)
  await expect(page.locator('.bg-tinted')).toHaveCount(1)
  // One primary on the screen (ADR-027 §6)
  await expect(page.locator('.shadow-action').filter({ visible: true })).toHaveCount(1)
  await axe(page, 'resultado')
})

test('erros → cards: desmarcar um e criar os outros, cada um no assunto da questão; depois "Revisar os 2 agora"', async ({ page }) => {
  const quizId = seedQuiz('praticar', seed.ctrlId, 'Erros para cards', [[seed.ctrlId, true], [seed.ctrlId, false], [seed.constId, false], [seed.ptId, false]])
  await gotoApp(page, `/simulados/${quizId}/resultado`)
  const errors = page.getByTestId('quiz-error-cards')
  await expect(errors).toContainText('Seus 3 erros viram cards')
  await page.getByTestId('error-card-4').getByRole('checkbox').uncheck()
  await page.getByTestId('quiz-create-cards').click()
  await expect(page.getByTestId('quiz-review-now')).toHaveText('Revisar os 2 agora')
  // Each card in the assunto of its question; the unchecked error is still there to create later
  const topics = sql(`select f.topic_id from quiz_questions q join flashcards f on f.id = q.flashcard_id where q.quiz_id = '${quizId}' order by q.position`).split('\n')
  expect(topics).toEqual([seed.ctrlId, seed.constId])
  await expect(page.getByTestId('error-card-4').getByRole('checkbox')).toBeEnabled()
  await expect(page.locator('.bg-tinted')).toHaveCount(1)
  // The session of exactly these 2 cards (scope=quiz:)
  const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
  await page.getByTestId('quiz-review-now').click()
  await expect(page).toHaveURL(new RegExp(`/revisar\\?scope=quiz:${quizId}`))
  expect((await (await session).json()).session_count).toBe(2)
})

test('"Refazer as que errei" copia as 3 erradas numa bateria nova sem gastar geração', async ({ page }) => {
  const before = quizUsage()
  await gotoApp(page, `/simulados/${seed.quizId}/resultado`)
  await page.getByTestId('quiz-retry-errors').click()
  await expect(page).toHaveURL(/\/simulados\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('quiz-topbar')).toContainText('Questão 1 de 3')
  expect(quizUsage()).toBe(before)
})

test('erro de rede no resultado: "Tentar de novo", nunca spinner infinito; o retry recupera', async ({ page }) => {
  let fail = true
  await page.route(url => url.pathname === `/api/quizzes/${seed.quizId}`, route => (fail ? route.abort('internetdisconnected') : route.fallback()))
  await page.goto(`/simulados/${seed.quizId}/resultado`)
  await expect(page.getByText('Não foi possível carregar o resultado')).toBeVisible()
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você acertou 1 de 4')
})

test('simulado do caderno (kind exam, modo Prova): cronômetro, sem correção na hora e "Finalizar" avisa as sem resposta', async ({ page }) => {
  const quizId = seedQuiz('praticar', seed.rootId, 'Simulado do caderno', [[seed.ctrlId, true], [seed.ptId, true], [seed.constId, true]], { status: 'in_progress' })
  php('praticar', `App\\Domain\\Quiz\\Models\\Quiz::whereKey('${quizId}')->update(['mode' => 'exam', 'kind' => 'exam', 'time_limit_seconds' => 1800, 'config' => ['quantity' => 3, 'types' => ['multiple_choice'], 'difficulty' => 'mixed', 'time_limit' => 1800, 'distribution' => [['topic_id' => '${seed.ctrlId}', 'name' => 'Constitucional', 'questions' => 2], ['topic_id' => '${seed.ptId}', 'name' => 'Português', 'questions' => 1]]]]); echo 'ok';`)
  await gotoApp(page, `/simulados/${quizId}`)
  await expect(page.getByTestId('quiz-timer')).toContainText(/(29|30):\d\d/)
  await page.keyboard.press('2')
  await page.keyboard.press('Enter')
  // Prova: saved and straight to the next one, no correction
  await expect(page.getByTestId('quiz-topbar')).toContainText('Questão 2 de 3')
  await expect(page.getByTestId('quiz-feedback')).toHaveCount(0)
  await page.getByRole('button', { name: 'Pular' }).click()
  await page.keyboard.press('1')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('quiz-primary')).toHaveText('Finalizar')
  await page.getByTestId('quiz-primary').click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('1 questão ficou sem resposta e conta como erro')
  await confirm.getByRole('button', { name: 'Finalizar' }).click()
  await expect(page).toHaveURL(new RegExp(`/simulados/${quizId}/resultado`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você acertou 1 de 3')
})
