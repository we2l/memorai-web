import fs from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall } from './support/fixtures'
import { ensureProgressoSeed, isoDays, type ProgressoSeed } from './support/seed-progresso'

/**
 * Progresso e Provas v3 (prd-4f-progresso-v3 §9, tasks 10.1): the summary with the single mastery formula;
 * the exam with its projection and "Como calculamos" (and the null case); the .ics export; "Passei" on a past
 * exam; "Treinar" on the weak assunto; the heatmap → the panel of the day; /provas → /progresso#provas;
 * "Definir prova" from a matéria; the projection on Hoje; a new account without zeros; axe in both themes.
 * No AI and nothing mocked: every number is the API's.
 */
test.use({ auditUser: 'progresso' })

let seed: ProgressoSeed
test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  if (!test.info().titlePath.includes('Conta nova')) seed = await ensureProgressoSeed(page)
})

const exam = (page: Page, id: string) => page.getByTestId(`exam-${id}`)

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map(v => `${label}: ${v.id} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
}

test('resumo do caderno da prova: domínio = o do caderno (/summary), acerto, lembrou e sequência; um primário', async ({ page }) => {
  await gotoApp(page, '/progresso')
  // The default scope: the caderno of the nearest exam
  await expect(page.getByTestId('progress-scope')).toHaveValue(seed.rootId)
  const summary = (await apiCall(page, 'GET', `/topics/${seed.rootId}/summary`)).data
  const progress = (await apiCall(page, 'GET', `/stats/progress?root_id=${seed.rootId}`)).data
  expect(progress.mastery.percent).toBe(summary.mastery.percent)
  const box = page.getByTestId('progress-summary')
  await expect(box).toContainText(`${summary.mastery.percent}%`)
  await expect(box).toContainText(`de domínio em ${seed.rootName}`)
  await expect(box).toContainText('de acerto em 12 questões')
  await expect(box).toContainText('lembrou ao revisar (30 dias)')
  await expect(box).toContainText(/\d+ dias? de sequência · recorde \d+|de sequência/)
  await expect(page.getByTestId('progress-primary')).toHaveText(/Revisar para a prova · \d+/)
  await expect(page.locator('.shadow-action').filter({ visible: true })).toHaveCount(1)
  // E2 (prd-visual-e2 RF-5.4) + prd-prontidao-prova RF-F3: the exam card with the readiness is the one lilac block
  await expect(page.locator('.bg-tinted')).toHaveCount(1)
  await expect(page.getByTestId('progress-exam-card')).toContainText('Prontidão para a prova')
})

test('prova com prontidão (número, partes, "Como calculamos", ações); a pequena diz o que falta', async ({ page }) => {
  await gotoApp(page, '/progresso#provas')
  const api = (await apiCall(page, 'GET', `/exams/${seed.examId}`)).data
  expect(api.readiness.score).not.toBeNull()
  const row = exam(page, seed.examId)
  await expect(row).toContainText('em 42 dias')
  await expect(row).toContainText(`caderno ${seed.rootName}`)
  const readiness = row.getByTestId('exam-readiness')
  await expect(readiness).toContainText(`Prontidão: ${api.readiness.score} de 100 · ${api.readiness.band.label}`)
  await expect(readiness).toContainText(`Memória ${api.readiness.parts[0].value}`)
  await row.getByRole('button', { name: 'Como calculamos' }).click()
  await expect(row.getByRole('button', { name: 'Como calculamos' })).toHaveAttribute('aria-expanded', 'true')
  await expect(row).toContainText(`lembrando ${api.projection.keep_pace}% mantendo o ritmo, ${api.projection.stop_today}% se parar hoje`)
  await expect(row).toContainText('não da aprovação')
  // Português has 3 cards and none reviewed: no number, what is left
  await expect(exam(page, seed.smallExamId).getByTestId('exam-readiness')).toHaveText(/para ver sua prontidão\.$/)
  await axe(page, '/progresso')
})

test('"Baixar para a agenda (.ics)" baixa o arquivo da prova', async ({ page }) => {
  await gotoApp(page, '/progresso#provas')
  await exam(page, seed.examId).getByRole('button', { name: /Mais ações de TRF 4ª Região/ }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /Baixar para a agenda/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('TRF 4ª Região.ics')
  expect(fs.readFileSync(await file.path(), 'utf8')).toContain('BEGIN:VCALENDAR')
})

test('prova passada: "Passei" grava a resposta e a linha passa a dizer', async ({ page }) => {
  await gotoApp(page, '/progresso#provas')
  const row = exam(page, seed.pastExamId)
  await expect(row).toContainText('há 20 dias')
  await row.getByRole('button', { name: 'Passei', exact: true }).click()
  await expect(row.getByTestId('exam-outcome')).toHaveText('Você respondeu: passei.')
  expect((await apiCall(page, 'GET', `/exams/${seed.pastExamId}`)).data.outcome).toBe('passed')
})

test('desempenho: "Treinar" no assunto com acerto baixo abre 20 questões dele', async ({ page }) => {
  await gotoApp(page, '/progresso')
  const line = page.getByTestId(`performance-${seed.constId}`)
  await expect(line).toContainText('33%')
  await line.getByRole('button', { name: 'Treinar' }).click()
  const sheet = page.getByRole('dialog', { name: 'Novas questões' })
  await expect(sheet.getByTestId('quiz-scope')).toHaveValue(seed.constId)
  await expect(sheet.getByTestId('quiz-count')).toHaveValue('20')
  await sheet.getByRole('button', { name: 'Fechar' }).click()
  // Português: no questions, no session left today → "Revisar N" or "Abrir", never "Treinar"
  await expect(page.getByTestId(`performance-${seed.ptId}`).getByRole('button', { name: 'Treinar' })).toHaveCount(0)
})

test('histórico: o dia de hoje (12 revisões) é um botão; setas andam e Enter abre o painel do dia', async ({ page }) => {
  await gotoApp(page, '/progresso')
  const grid = page.getByTestId('progress-history').getByRole('grid')
  const today = grid.locator('button[aria-current="date"]')
  await expect(today).toHaveAttribute('aria-label', /: 12 revisões$/)
  await today.focus()
  await page.keyboard.press('ArrowUp')
  await expect(grid.locator('button:focus')).toHaveAttribute('aria-label', /sem estudo|revis/)
  await page.keyboard.press('ArrowDown')
  await expect(today).toBeFocused()
  await page.keyboard.press('Enter')
  const panel = page.getByTestId('study-day')
  await expect(panel.getByTestId('study-day-summary')).toContainText('12 revisões')
  await expect(panel.getByRole('region', { name: 'Assuntos revisados' }).getByRole('link', { name: /Constitucional/ })).toHaveAttribute('href', `/cadernos/${seed.constId}`)
  await axe(page, 'painel do dia')
})

test('/provas redireciona: 301 no servidor e ?nova=1 abre o formulário em Progresso', async ({ page, request }) => {
  const res = await request.get('/provas', { maxRedirects: 0 })
  expect(res.status()).toBe(301)
  expect(res.headers().location).toBe('/progresso#provas')
  // The new link of "Nova prova" (search, public result): the dialog opens in Progresso
  await gotoApp(page, '/progresso?nova_prova=1#provas')
  await expect(page.getByRole('dialog', { name: 'Nova prova' })).toBeVisible()
  // /provas/resultado (the e-mail link) is not redirected
  expect((await request.get('/provas/resultado', { maxRedirects: 0 })).status()).toBe(200)
})

test('"Definir prova" no ⋯ da matéria cria a prova com a cobertura dela', async ({ page }) => {
  await gotoApp(page, `/cadernos/${seed.constId}`)
  await page.getByRole('button', { name: 'Mais ações de Constitucional' }).click()
  await page.getByRole('menuitem', { name: /Definir prova/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova prova' })
  await expect(dialog.getByTestId('exam-root')).toHaveValue(seed.rootId)
  await expect(dialog.getByRole('radio', { name: 'Algumas matérias' })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: 'Constitucional' })).toBeChecked()
  await axe(page, 'ExamDialog')
  await dialog.getByTestId('exam-title').fill('Constitucional — P1')
  await dialog.getByTestId('exam-date').fill(isoDays(20))
  const created = page.waitForResponse(r => r.url().endsWith('/api/exams') && r.request().method() === 'POST')
  await dialog.getByTestId('exam-save').click()
  const body = (await (await created).json()).data
  expect(body.coverage.map((c: any) => c.topic_id)).toEqual([seed.constId])
  await expect(dialog).toBeHidden()
  await apiCall(page, 'DELETE', `/exams/${body.id}`)
})

test('Hoje: a prova mais próxima ganha a prontidão (ou o que falta para ela)', async ({ page }) => {
  const upcoming = (await apiCall(page, 'GET', '/exams/upcoming')).data as any[]
  const next = upcoming.filter(e => e.days_remaining >= 0).sort((a, b) => a.days_remaining - b.days_remaining)[0]
  await gotoApp(page, '/hoje')
  const card = page.getByTestId('home-exam')
  if (next.readiness?.score != null) {
    await expect(card).toContainText('Prontidão para a prova')
    await expect(card.getByTestId('readiness-band')).toHaveText(next.readiness.band.label)
  }
  else {
    await expect(page.getByTestId('home-exam-pace')).toContainText('para ver sua prontidão')
  }
})

test.describe('Conta nova', () => {
  test.use({ auditUser: 'progressoNew' })

  test('sem cards: um bloco só, sem zeros, e "Crie seus primeiros cards" é o primário', async ({ page }) => {
    await gotoApp(page, '/progresso')
    await expect(page.getByTestId('progress-new')).toContainText('Seu progresso aparece aqui')
    await expect(page.getByTestId('progress-summary')).toHaveCount(0)
    await expect(page.getByTestId('progress-exams')).toContainText('Defina sua prova para ver o ritmo e a projeção')
    await expect(page.locator('.shadow-action').filter({ visible: true })).toHaveCount(1)
    await axe(page, 'conta nova')
  })
})

test('axe sem violação séria em claro e escuro, 390 e 1440 px', async ({ page }) => {
  test.setTimeout(90_000)
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: theme })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
      await gotoApp(page, '/progresso')
      await expect(page.getByTestId('progress-summary')).toBeVisible()
      await axe(page, `/progresso ${theme} ${width}`)
    }
  }
})
