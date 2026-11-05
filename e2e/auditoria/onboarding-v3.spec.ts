import AxeBuilder from '@axe-core/playwright'
import { test, expect, gotoApp, uid, sql, USERS, AUDIT_PASSWORD, type UserKey } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Onboarding v3 (prd-4g-conta-onboarding-v3 §9): modo → conteúdo → primeira revisão. O caminho do exemplo não
 * chama IA nem pede o e-mail confirmado: nenhuma rota de persistência é mockada; a IA do caminho "texto" é
 * mockada na geração. As contas são próprias (uma por teste), sem onboarding.
 */
const RUN_IP = `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`
const AI_ROUTE = /\/api\/(ai\/|chat|quizzes|podcasts$|documents\/[^/]+\/(generate|regenerate))/

async function isolateRegisterThrottle(page: Page) {
  await page.route('**/api/register', async route => route.continue({ headers: { ...(await route.request().allHeaders()), 'x-forwarded-for': RUN_IP } }))
}

async function chooseMode(page: Page, mode: string) {
  await page.getByRole('radio', { name: mode }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Vamos criar seus primeiros cards' })).toBeVisible()
}

/** Avalia os N cards pelo teclado: o 1º com "De novo", os outros com "Bom" (com ou sem o sumiço da fila). */
async function rateAll(page: Page, n: number, firstRating = '3') {
  for (let i = 0; i < n; i++) {
    await expect(page.getByTestId('review-card')).toBeVisible()
    await expect(page.getByTestId('review-batch')).toContainText(`card ${i + 1} de ${n}`)
    await page.keyboard.press('Space')
    await expect(page.getByTestId('review-answer')).toBeVisible()
    await page.keyboard.press(i === 0 ? firstRating : '3')
  }
}

const cardsOf = (key: UserKey) => sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS[key].email}'`)

test.describe('Cadastro por e-mail até o 1º lote', () => {
  test('exemplo → 1º lote → celebração → Hoje, sem IA e sem confirmar o e-mail; ativação gravada uma vez', async ({ page }) => {
    test.setTimeout(120_000)
    await isolateRegisterThrottle(page)
    const aiCalls: string[] = []
    const apiCalls: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (!url.pathname.startsWith('/api/')) return
      if (AI_ROUTE.test(url.pathname) && r.method() === 'POST') aiCalls.push(url.pathname)
      apiCalls.push(`${r.method()} ${url.pathname}`)
    })
    const email = `e2e-v3-${uid()}@audit.test`
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Criar sua conta')
    await expect(page.locator('#password_confirmation')).toHaveCount(0)
    await page.locator('#name').fill('Aluno Novo')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(AUDIT_PASSWORD)
    await page.locator('#accept_terms').check()

    const started = Date.now()
    let clicks = 0
    const res = page.waitForResponse(r => r.url().endsWith('/api/register'))
    await page.getByRole('button', { name: 'Criar conta' }).click(); clicks++
    const r = await res
    test.skip(r.status() === 429, 'ambiente: throttle de cadastro (3/h por IP) esgotado')
    expect(r.status()).toBe(201)

    await page.waitForURL('**/comecar')
    await page.getByRole('radio', { name: 'Concurso ou OAB' }).check(); clicks++
    await page.getByRole('button', { name: 'Continuar' }).click(); clicks++
    await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click(); clicks++

    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    await expect(page.getByTestId('review-card')).toBeVisible()
    const toFirstCard = Date.now() - started
    test.info().annotations.push({ type: 'medição', description: `1º card: ${clicks} cliques, ${toFirstCard} ms` })
    expect(clicks, 'cliques até o 1º card').toBeLessThanOrEqual(5)
    expect(toFirstCard, 'tempo até o 1º card').toBeLessThan(15_000)

    await expect(page.getByTestId('review-onboarding')).toContainText('Passo 3 de 3')
    // Passo 3 sem a casca: sem o aviso de e-mail ocupando a altura da revisão e sem IA à vista
    await expect(page.locator('#verify-email-notice')).toHaveCount(0)
    await expect(page.getByTestId('review-show')).toBeInViewport()
    // O 1º com "De novo" na hora: o diário de erros não interrompe o 1º lote, mesmo com a tecla antes do /settings
    await rateAll(page, 8, '1')

    const end = page.getByTestId('onboarding-end')
    await expect(end).toBeVisible({ timeout: 15_000 })
    await expect(end.getByRole('heading', { level: 1 })).toHaveText('Primeiro lote concluído!')
    await expect(end.getByTestId('onboarding-remembered')).toHaveText('Você lembrou 7 de 8.')
    await expect(end.getByTestId('onboarding-tomorrow')).toContainText('Amanhã')
    await expect(end.getByTestId('onboarding-reminder')).toContainText('19h')

    await expect.poll(() => sql(`select first_batch_at is not null from users where email='${email}'`)).toBe('t')
    expect(apiCalls.filter(c => c === 'POST /api/onboarding/first-batch')).toHaveLength(1)
    expect(aiCalls, 'nenhuma rota de IA no caminho do exemplo').toEqual([])
    expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${email}' and f.source_note_id is not null`)).toBe('8')
    expect(sql(`select email_verified_at is null from users where email='${email}'`)).toBe('t')

    await end.getByRole('link', { name: 'Ir para o Hoje' }).click()
    await page.waitForURL('**/hoje')
    await expect(page.getByTestId('sample-tag').first()).toHaveText('Exemplo')
  })
})

test.describe('Sem confirmar o e-mail', () => {
  test.use({ auditUser: 'onbExit' })

  test('texto mostra Reenviar e Já confirmei; o exemplo continua liberado; sair no meio vai ao Hoje com o checklist', async ({ page }) => {
    await page.route('**/api/email/verification-notification', r => r.fulfill({ status: 202, json: { message: 'ok' } }))
    // Os textos legais abrem mesmo antes de concluir (não voltam para /comecar)
    await gotoApp(page, '/termos')
    expect(new URL(page.url()).pathname).toBe('/termos')
    await gotoApp(page, '/comecar')
    await chooseMode(page, 'Outro')

    await expect(page.getByTestId('verify-email-line')).toContainText('Confirme seu e-mail quando puder')
    await expect(page.getByRole('radio', { name: 'Usar um material de exemplo' })).toBeChecked()
    await page.getByRole('radio', { name: 'Colar um texto' }).check()
    const notice = page.locator('#verify-email-notice')
    await expect(notice).toContainText('Confirme seu e-mail para usar a IA')
    await expect(page.getByRole('button', { name: 'Reenviar e-mail' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Já confirmei' })).toBeVisible()
    await expect(page.getByTestId('content-primary')).toBeDisabled()

    await page.getByRole('radio', { name: 'Usar um material de exemplo' }).check()
    await expect(notice).toHaveCount(0)
    await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click()
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    await expect(page.getByTestId('review-card')).toBeVisible()
    expect(cardsOf('onbExit')).toBe('8')

    // Sair no meio: o onboarding já acabou, então o Hoje abre (e não volta para /comecar)
    await page.getByTestId('review-exit').click()
    await page.waitForURL('**/hoje')
    await expect(page.getByTestId('home-checklist')).toBeVisible()
    // O assistente não reabre: "Voltar" não criaria outro caderno nem gastaria cota
    await page.goto('/comecar')
    await page.waitForURL('**/hoje')
    expect(sql(`select first_batch_at is null from users where email='${USERS.onbExit.email}'`)).toBe('t')
  })
})

test.describe('Texto com o e-mail confirmado', () => {
  test.use({ auditUser: 'onbText' })

  test('IA mockada na geração: gera, grava pela API real e revisa o recorte da nota', async ({ page }) => {
    test.setTimeout(90_000)
    const cards = [
      { front: 'O que é fotossíntese?', back: 'Luz vira energia química.' },
      { front: 'Onde ocorre?', back: 'Nos cloroplastos.' },
    ]
    await page.route('**/api/ai/generate-cards', r => r.fulfill({ status: 202, json: { data: { id: '00000000-0000-4000-8000-000000000002', status: 'done', result: { cards }, error: null } } }))
    await gotoApp(page, '/comecar')
    await chooseMode(page, 'Faculdade')
    await expect(page.getByTestId('verify-email-line')).toHaveCount(0)
    await page.getByRole('radio', { name: 'Colar um texto' }).check()
    await page.locator('#material').fill('Fotossíntese ocorre nos cloroplastos.')
    await expect(page.locator('#notebook-name')).toHaveValue(/Fotossíntese/)
    // Fechar o onboarding falha uma vez: os cards já existem, então só isso é refeito
    let failures = 1
    await page.route('**/api/onboarding/complete', (r) => {
      if (failures-- > 0) return r.fulfill({ status: 500, json: { message: 'erro' } })
      return r.continue()
    })
    await page.getByRole('button', { name: 'Gerar cards do texto' }).click()
    const retry = page.getByTestId('processing-retry')
    await expect(retry).toBeVisible()
    await expect(page.getByTestId('processing-state')).toContainText('Seu material está salvo')
    expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS.onbText.email}'`)).toBe('2')
    await retry.click()
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    await rateAll(page, 2)
    await expect(page.getByTestId('onboarding-end')).toBeVisible({ timeout: 15_000 })
    expect(sql(`select count(*) from flashcards f join users u on u.id=f.user_id where u.email='${USERS.onbText.email}' and f.source_note_id is not null`)).toBe('2')
    await expect.poll(() => sql(`select first_batch_at is not null from users where email='${USERS.onbText.email}'`)).toBe('t')
  })
})

test.describe('Prova opcional', () => {
  test.use({ auditUser: 'onbExam' })

  test('modo concurso: a data vira uma prova no caderno de exemplo, só depois dos cards', async ({ page }) => {
    await gotoApp(page, '/comecar')
    await page.getByRole('radio', { name: 'Concurso ou OAB' }).check()
    const date = page.getByLabel(/Quando é a sua prova/)
    await expect(date).toBeVisible()
    // Data que a API recusaria: avisa aqui, em vez de sumir em silêncio depois dos cards
    await date.fill('2020-01-01')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Escolha uma data a partir de amanhã.')).toBeVisible()
    await date.fill('2031-03-10')
    expect(sql(`select count(*) from exams e join users u on u.id=e.user_id where u.email='${USERS.onbExam.email}'`)).toBe('0')
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByTestId('content-step')).toContainText('Princípios fundamentais da Constituição')
    const created = page.waitForResponse(r => r.url().endsWith('/api/exams') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click()
    expect((await created).status()).toBe(201)
    await expect.poll(() => sql(`select count(*) from exams e join users u on u.id=e.user_id where u.email='${USERS.onbExam.email}' and e.exam_date='2031-03-10'`)).toBe('1')
    await expect(page.getByTestId('review-card')).toBeVisible()
  })
})

test.describe('Anki sem confirmar o e-mail', () => {
  test.use({ auditUser: 'onbAnki' })

  test('"Trazer do Anki" abre o import e conclui o onboarding', async ({ page }) => {
    await gotoApp(page, '/comecar')
    await chooseMode(page, 'Idiomas')
    await page.getByRole('radio', { name: 'Trazer do Anki' }).check()
    await expect(page.getByTestId('content-primary')).toBeEnabled()
    await page.getByRole('button', { name: 'Importar do Anki' }).click()
    await page.waitForURL('**/importar')
    expect(sql(`select onboarding_completed_at is not null from users where email='${USERS.onbAnki.email}'`)).toBe('t')
  })
})

test.describe('Caderno de exemplo', () => {
  test.use({ auditUser: 'onbSample' })

  test('selo "Exemplo" na lista, no Hoje e no caderno; "Apagar o exemplo" remove', async ({ page }) => {
    await gotoApp(page, '/comecar')
    await chooseMode(page, 'Idiomas')
    await expect(page.getByTestId('content-step')).toContainText('8 phrasal verbs do dia a dia')
    await page.getByRole('button', { name: 'Criar 8 cards e revisar' }).click()
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')

    await gotoApp(page, '/cadernos')
    const row = page.getByRole('link', { name: /Exemplo · Inglês/ })
    await expect(row.getByTestId('sample-tag')).toHaveText('Exemplo')
    await gotoApp(page, '/hoje')
    await expect(page.getByTestId('sample-tag').first()).toBeVisible()
    await gotoApp(page, '/cadernos')
    await page.getByRole('link', { name: /Exemplo · Inglês/ }).click()
    await expect(page.getByTestId('scope-header').getByTestId('sample-tag')).toHaveText('Exemplo')

    await page.getByRole('button', { name: /Mais ações de Exemplo/ }).click()
    await page.getByRole('menuitem', { name: 'Apagar o exemplo' }).click()
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
    await expect(dialog.first()).toBeVisible()
    const input = dialog.first().getByRole('textbox')
    if (await input.count()) await input.fill('Exemplo · Inglês')
    await dialog.first().getByRole('button', { name: /Excluir|Apagar/ }).last().click()
    await expect.poll(() => sql(`select count(*) from topics t join users u on u.id=t.user_id where u.email='${USERS.onbSample.email}' and t.deleted_at is null`), { timeout: 20_000 }).toBe('0')
  })
})

test.describe('Só no teclado, com 1 primário e 1 h1 em cada passo, e axe', () => {
  test.use({ auditUser: 'onbKeyboard' })

  async function primaries(page: Page) {
    return page.locator('main .bg-action.text-on-action, [data-testid="onboarding-end"] .bg-action.text-on-action').count()
  }

  test('o caminho "tema" não existe; a jornada inteira vai só no teclado', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoApp(page, '/comecar')
    await expect(page.locator('h1')).toHaveCount(1)
    // Sem modo escolhido, "Continuar" espera; depois é o único primário
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await page.getByRole('radio', { name: 'Concurso ou OAB' }).check()
    expect(await primaries(page)).toBe(1)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])

    // Passo 1: Tab até o grupo, setas escolhem, Enter segue
    await page.getByRole('radio', { name: 'Concurso ou OAB' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'Faculdade' })).toBeChecked()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Vamos criar seus primeiros cards' })).toBeFocused()

    // Passo 2
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await primaries(page)).toBe(1)
    await expect(page.getByText(/por tema|digite o tema/i)).toHaveCount(0)
    await expect(page.getByRole('radio')).toHaveCount(4)
    await page.getByRole('radio', { name: 'Usar um material de exemplo' }).focus()
    await page.keyboard.press('Enter')

    // Passo 3 até o fim do lote
    await page.waitForURL('**/revisar?scope=note:**&onboarding=1')
    await rateAll(page, 8)
    await expect(page.getByTestId('onboarding-end')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('h1')).toHaveCount(1)
    expect(await primaries(page)).toBe(1)
    await page.getByRole('link', { name: 'Ir para o Hoje' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForURL('**/hoje')
  })
})
