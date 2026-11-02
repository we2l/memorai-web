import { test, expect, gotoApp, apiCall, uid, tinker, cachedLoginState, doc, USERS } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Caderno F1, "pontes e números" (prd-caderno-f1-pontes, tasks 9.1).
 * - "Este caderno" = o tópico e toda a subárvore: o mesmo número na Home, no caderno, na árvore e na sessão.
 * - As áreas devolvem a pessoa ao caderno (simulado → resultado → caderno) e dizem o requisito antes.
 * Usuário próprio (e2e-scope@audit.test, recriado a cada execução) e o seed pesado (perf@audit.test, só GET).
 * Nenhuma IA: o simulado concluído é gravado direto no banco (tinker), e os cards vêm de /ai/accept-cards.
 */
test.use({ auditUser: 'scope' })

// Since the 4b-1 the caderno is a hub (/cadernos/{id}): the tree left; the list and the subjects table carry the numbers
const num = (text: string, label: RegExp) => Number(text.match(label)?.[1] ?? NaN)
const reviewCta = (page: Page) => page.getByTestId('scope-review')

/** Root caderno with no direct cards and one subject with `cards` new cards (the Anki shape). */
async function ankiShapedCaderno(page: Page, cards = 3) {
  const root = (await apiCall(page, 'POST', '/topics', { name: `Inglês ${uid()}` })).data
  const child = (await apiCall(page, 'POST', '/topics', { name: 'Vocabulary', parent_id: root.id })).data
  if (cards) await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: child.id, cards: Array.from({ length: cards }, (_, i) => ({ front: `Word ${i}`, back: `Palavra ${i}` })) })
  return { root, child }
}

/** A finished quiz of the caderno, 1 right and 1 wrong answer, straight in the database (no AI). */
function seedCompletedQuiz(topicId: string): string {
  const out = tinker(`
    $u = App\\Domain\\User\\Models\\User::where('email', '${USERS.scope.email}')->firstOrFail();
    $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${topicId}', 'title' => 'Simulado F1', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => 2, 'types' => ['true_false'], 'difficulty' => 'mixed'], 'total_questions' => 2, 'correct_count' => 1, 'score_percent' => 50, 'time_spent_seconds' => 60, 'started_at' => now()->subMinute(), 'completed_at' => now()]);
    foreach ([[1, 'true', true], [2, 'false', false]] as [$pos, $answer, $ok]) {
      App\\Domain\\Quiz\\Models\\QuizQuestion::create(['quiz_id' => $q->id, 'position' => $pos, 'type' => 'true_false', 'difficulty' => 'easy', 'stem' => "Afirmação $pos", 'explanation' => 'Gabarito do teste.', 'correct_answer' => 'true', 'user_answer' => $answer, 'is_correct' => $ok, 'answered_at' => now()]);
    }
    echo 'QUIZ_ID=' . $q->id;
  `)
  const id = out.match(/QUIZ_ID=([0-9a-f-]{36})/)?.[1]
  if (!id) throw new Error(`simulado não criado:\n${out}`)
  return id
}

test.describe('Um número só (seed perf@audit.test)', () => {
  test('o mesmo N na Home, no caderno, na árvore e na sessão; "N cards" da árvore = subárvore', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: await cachedLoginState(browser, 'perf@audit.test', 'password') })
    const page = await ctx.newPage()
    await gotoApp(page, '/hoje')
    const heavy = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.name === 'Direito — TRF (pesado)')
    test.skip(!heavy, 'seed pesado ausente (memorai-api/scripts/perf/seed-caderno-pesado.php)')
    const details = (await apiCall(page, 'GET', `/topics/${heavy.id}/details`)).data

    // Hoje: the caderno row ("N hoje", Hoje v3)
    const homeCard = page.getByTestId('home-notebooks').locator(`a[href="/cadernos/${heavy.id}"]`).first()
    await expect(homeCard).toBeVisible()
    const home = num(await homeCard.innerText(), /(\d+)\s+hoje/)

    // List of cadernos (the old tree root row) and the hub header
    await gotoApp(page, '/cadernos')
    const row = num(await page.getByTestId('notebook-list').locator(`a[href="/cadernos/${heavy.id}"]`).innerText(), /(\d+)\s+hoje/)
    await gotoApp(page, `/cadernos/${heavy.id}`)
    const cta = reviewCta(page)
    await expect(cta).toBeVisible()
    const header = num(await cta.innerText(), /· (\d+)/)
    const summary = (await apiCall(page, 'GET', `/topics/${heavy.id}/summary`)).data
    // The cards of the header are of the subtree (not the direct cards of GET /topics)
    await expect(page.getByTestId('scope-header')).toContainText(`de ${details.flashcards_count.toLocaleString('pt-BR')} em dia`)

    // Session that the CTA opens
    const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
    await cta.click()
    const sessionCount = (await (await session).json()).session_count

    const evidence = `home=${home} caderno=${header} lista=${row} sessão=${sessionCount} details=${details.session_count} · cards: resumo=${summary.counts.cards} details=${details.flashcards_count} diretos=${heavy.flashcards_count}`
    test.info().annotations.push({ type: 'evidência', description: evidence })
    console.log(`[f1 números] ${evidence}`)
    expect(new Set([home, header, row, sessionCount, details.session_count]).size).toBe(1)
    expect(summary.counts.cards).toBe(details.flashcards_count)
    expect(summary.counts.cards).toBeGreaterThan(heavy.flashcards_count)
    await ctx.close()
  })

  test('um assunto: a linha de Matérias, o cabeçalho dele e a sessão dizem o mesmo número', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: await cachedLoginState(browser, 'perf@audit.test', 'password') })
    const page = await ctx.newPage()
    await gotoApp(page, '/hoje')
    const heavy = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.name === 'Direito — TRF (pesado)')
    test.skip(!heavy, 'seed pesado ausente')
    const subject = (heavy.children as any[]).find(c => c.name === 'Direito Administrativo') ?? heavy.children[0]

    await gotoApp(page, `/cadernos/${heavy.id}`)
    const badge = num((await page.getByTestId('subject-row').filter({ hasText: subject.name }).first().getAttribute('aria-label'))!, /(\d+) para hoje/)
    await gotoApp(page, `/cadernos/${subject.id}`)
    const cta = reviewCta(page)
    const header = num(await cta.innerText(), /· (\d+)/)
    const session = page.waitForResponse(r => r.url().includes('/api/review/session'))
    await cta.click()
    expect((await (await session).json()).session_count).toBe(header)
    expect(badge).toBe(header)
    await ctx.close()
  })
})

test.describe('Caderno raiz do Anki (cards só nos assuntos)', () => {
  test('mostra os cards da subárvore e tem botão Revisar com a sessão de todos os assuntos', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root } = await ankiShapedCaderno(page, 3)
    await gotoApp(page, `/cadernos/${root.id}`)

    await expect(page.getByTestId('scope-header')).toContainText('0 de 3 em dia')
    await expect(page.getByTestId('subject-row').filter({ hasText: 'Vocabulary' })).toHaveAttribute('aria-label', /3 para hoje/)
    const cta = reviewCta(page)
    await expect(cta).toHaveText('Revisar hoje · 3')

    const session = page.waitForResponse(r => r.url().includes(`/api/review/session?topic_id=${root.id}`))
    await cta.click()
    const body = await (await session).json()
    expect(body.session_count).toBe(3)
    expect(body.data).toHaveLength(3)
  })
})

test.describe('Simulado devolve ao escopo', () => {
  test('caderno → simulado com o mesmo escopo → resultado → criar cards → voltar ao mesmo caderno', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root } = await ankiShapedCaderno(page, 1)

    // The caderno opens /simulados with its scope already chosen (RF-F1)
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.getByTestId('practice-quiz').click()
    await expect(page).toHaveURL(new RegExp(`/simulados\\?topic_id=${root.id}`))
    const sheet = page.getByRole('dialog', { name: 'Novo simulado' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('combobox', { name: 'Caderno' })).toHaveValue(root.id)
    await sheet.getByRole('button', { name: 'Fechar' }).click()

    const quizId = seedCompletedQuiz(root.id)
    await gotoApp(page, `/simulados/${quizId}/resultado`)
    await expect(page.getByRole('heading', { name: 'Simulado F1' })).toBeVisible()
    const created = page.waitForResponse(r => r.url().endsWith(`/api/quizzes/${quizId}/create-cards`))
    await page.getByRole('button', { name: 'Criar cards dos erros (1)' }).click()
    expect((await (await created).json()).data.cards_created).toBe(1)

    // Not only a toast: the next step in the same scope (RF-F2, N12)
    const next = page.getByRole('status').filter({ hasText: '1 card dos erros criado em' })
    await expect(next).toBeVisible()
    // F2: exactly the cards of these errors (scope=quiz:), no longer the whole caderno
    await expect(next.getByRole('link', { name: 'Revisar o card agora' })).toHaveAttribute('href', `/revisar?scope=quiz:${quizId}`)
    // "Voltar ao caderno" opens its cards (the old Cards tab is the library of the scope)
    await next.getByRole('link', { name: 'Voltar ao caderno' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${root.id}/cards$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Todos os cards' })).toBeVisible()
    // The card of the error is in the caderno now (subtree: 1 + 1), and the hub has the line "Erros das questões"
    await expect(page.getByText(/^2 cards em /)).toBeVisible()
    await gotoApp(page, `/cadernos/${root.id}`)
    await expect(page.getByTestId('special-quiz')).toContainText('1 card dos simulados')
  })
})

test.describe('Revisão → nota', () => {
  test('"Da sua nota" no erro vira "Abrir na nota", que abre o caderno com a nota (RF-F3)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root, child } = await ankiShapedCaderno(page, 0)
    const note = (await apiCall(page, 'POST', `/topics/${child.id}/notes`, { title: 'Verbo to be' })).data
    await apiCall(page, 'PUT', `/notes/${note.id}`, { content: doc('O verbo to be tem três formas no presente: am, is e are.') })
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: child.id, note_id: note.id, cards: [{ front: 'Formas de to be?', back: 'am, is, are' }] })

    await gotoApp(page, `/revisar?topic_id=${root.id}`)
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Verso do card' })).toBeVisible()
    const rated = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/review'))
    await page.keyboard.press('1')
    await rated
    await expect(page.getByText('Da sua nota:')).toBeVisible()
    await page.getByRole('link', { name: 'Abrir na nota' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${child.id}/material/${note.id}$`))
    await expect(page.getByText('três formas no presente')).toBeVisible()
  })
})

test.describe('Hub: "+ Matéria" e "+ Assunto"', () => {
  test('cria matéria e assunto no próprio hub, até 2 níveis abaixo do caderno', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const root = (await apiCall(page, 'POST', '/topics', { name: `Direito ${uid()}` })).data
    await apiCall(page, 'POST', `/topics/${root.id}/notes`, { title: 'Material', content: null })

    const addSubject = async (scopeId: string, kind: 'matéria' | 'assunto', name: string) => {
      await gotoApp(page, `/cadernos/${scopeId}`)
      await page.getByTestId('scope-add-subject').click()
      const dialog = page.getByRole('dialog', { name: kind === 'matéria' ? 'Nova matéria' : 'Novo assunto' })
      await dialog.getByRole('textbox', { name: kind === 'matéria' ? 'Nome da matéria' : 'Nome do assunto' }).fill(name)
      await dialog.getByRole('button', { name: 'Criar' }).click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('status').getByText(kind === 'matéria' ? 'Matéria criada!' : 'Assunto criado!').first()).toBeVisible()
      await expect(page.getByTestId('subject-row').filter({ hasText: name })).toBeVisible()
    }
    await addSubject(root.id, 'matéria', 'Administrativo')
    const adm = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.id === root.id).children[0]
    await addSubject(adm.id, 'assunto', 'Atos')

    // 3rd level below the caderno: the hub does not offer it
    const atos = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.id === root.id).children[0].children[0]
    await gotoApp(page, `/cadernos/${atos.id}`)
    await expect(page.getByTestId('scope-header').getByRole('heading', { level: 1 })).toHaveText('Atos')
    await expect(page.getByTestId('scope-add-subject')).toHaveCount(0)

    const saved = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.id === root.id)
    expect(saved.children.map((c: any) => c.name)).toEqual(['Administrativo'])
    expect(saved.children[0].children.map((c: any) => c.name)).toEqual(['Atos'])
  })
})

test.describe('Requisito antes da ação (sem material)', () => {
  test('podcast e simulado dizem o que falta, e não deixam gerar', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root } = await ankiShapedCaderno(page, 2)
    await gotoApp(page, `/cadernos/${root.id}`)

    // On the hub, before any click: Praticar says what is missing
    const podcast = page.getByTestId('scope-listen')
    const quiz = page.getByTestId('practice-quiz')
    await expect(page.getByTestId('practice-listen')).toContainText('Revise 5 cards para liberar · faltam 5')
    await expect(quiz).toContainText('Escreva 100 palavras em notas para liberar · faltam 100')

    // Podcast sheet: same text, button waits (no POST /podcasts: the aiGuard would record it)
    await podcast.click()
    const podcastSheet = page.getByRole('dialog', { name: 'Gerar podcast' })
    await expect(podcastSheet.getByRole('status')).toHaveText('Revise 5 cards para liberar · faltam 5')
    await expect(podcastSheet.getByRole('button', { name: 'Gerar podcast' })).toBeDisabled()
    await podcastSheet.getByRole('button', { name: 'Fechar' }).click()

    // Simulado sheet
    await quiz.click()
    const quizSheet = page.getByRole('dialog', { name: 'Novo simulado' })
    await expect(quizSheet.getByRole('status')).toHaveText('Escreva 100 palavras em notas para liberar · faltam 100')
    await expect(quizSheet.getByRole('button', { name: 'Gerar simulado' })).toBeDisabled()
  })

  test('um 422 com code no criar vira a mesma mensagem, nunca um erro cru', async ({ page, aiGuard }) => {
    await gotoApp(page, '/hoje')
    const { root } = await ankiShapedCaderno(page, 1)
    // The provider step answers what the API would after a race (material removed meanwhile): /details said ok
    await page.route(`**/api/topics/${root.id}/details`, async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.can_quiz = { ok: true }
      await route.fulfill({ response: res, json: body })
    })
    await page.route('**/api/quizzes', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { message: 'Adicione material ao caderno para gerar um simulado: pelo menos 100 palavras em notas (faltam 100).', code: 'needs_material', requirement: { required: 100, current: 0 }, errors: { topic_id: ['…'] } } })
      : route.fallback())
    await gotoApp(page, `/simulados?topic_id=${root.id}`)
    const sheet = page.getByRole('dialog', { name: 'Novo simulado' })
    await sheet.getByRole('button', { name: 'Gerar simulado' }).click()
    await expect(sheet.getByRole('status')).toHaveText('Escreva 100 palavras em notas para liberar · faltam 100')
    await expect(page.getByRole('alert').filter({ hasText: /422|Dados inválidos/ })).toHaveCount(0)
    expect(aiGuard).toEqual([])
  })
})
