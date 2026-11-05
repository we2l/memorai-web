import AxeBuilder from '@axe-core/playwright'
import type { Browser, Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker, cachedLoginState, USERS } from './support/fixtures'

/**
 * Caderno v3, o hub (prd-4b-caderno-v3 §10.1, tasks 13.1): um painel por escopo (caderno, matéria, assunto)
 * no lugar das abas. Usuário próprio (e2e-hub@audit.test, recriado a cada execução) e o seed pesado
 * (perf@audit.test, só leitura). Nenhuma IA: o upload de PDF é respondido pelo teste e o simulado concluído
 * é gravado direto no banco.
 */
test.use({ auditUser: 'hub' })

const num = (text: string, re: RegExp) => Number(text.match(re)?.[1]?.replace(/\./g, '') ?? NaN)
const header = (page: Page) => page.getByTestId('scope-header')
const materials = (page: Page) => page.getByTestId('material-row')

async function heavyPage(browser: Browser, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ storageState: await cachedLoginState(browser, 'perf@audit.test', 'password'), viewport })
  const page = await ctx.newPage()
  await gotoApp(page, '/hoje')
  const heavy = ((await apiCall(page, 'GET', '/topics')).data as any[]).find(t => t.name === 'Direito — TRF (pesado)')
  return { ctx, page, heavy }
}

/** Caderno with a matéria and an assunto; `cards` new cards in the matéria and one note with words. */
async function caderno(page: Page, body: Record<string, unknown> = {}, cards = 3) {
  const root = (await apiCall(page, 'POST', '/topics', { name: `Caderno ${uid()}`, learning_mode: 'exam', ...body })).data
  const subject = (await apiCall(page, 'POST', '/topics', { name: 'Constitucional', parent_id: root.id })).data
  const topic = (await apiCall(page, 'POST', '/topics', { name: 'Controle', parent_id: subject.id })).data
  if (cards) await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: subject.id, cards: Array.from({ length: cards }, (_, i) => ({ front: `Pergunta ${i}`, back: `Resposta ${i}` })) })
  return { root, subject, topic }
}

test.describe('Um número de sessão (seed pesado)', () => {
  test('"Revisar hoje · N" = linha da lista = Hoje = barra do celular = sessão', async ({ browser }) => {
    const { ctx, page, heavy } = await heavyPage(browser)
    test.skip(!heavy, 'seed pesado ausente (memorai-api/scripts/perf/seed-caderno-pesado.php)')
    const homeRow = page.getByTestId('home-notebooks').locator(`a[href="/cadernos/${heavy.id}"]`).first()
    const home = num(await homeRow.innerText(), /(\d+)\s+hoje/)

    await gotoApp(page, '/cadernos')
    const listRow = num(await page.getByTestId('notebook-list').locator(`a[href="/cadernos/${heavy.id}"]`).innerText(), /(\d+)\s+hoje/)

    await gotoApp(page, `/cadernos/${heavy.id}`)
    const cta = page.getByTestId('scope-review')
    const hub = num(await cta.innerText(), /· (\d+)/)

    const phone = await ctx.newPage()
    await phone.setViewportSize({ width: 390, height: 844 })
    await gotoApp(phone, `/cadernos/${heavy.id}`)
    const bar = num(await phone.getByTestId('scope-review-bar').innerText(), /· (\d+)/)
    await expect(phone.getByTestId('scope-review')).toBeHidden()

    const session = page.waitForResponse(r => r.url().includes('/api/review/session?'))
    await cta.click()
    const sessionCount = (await (await session).json()).session_count
    const evidence = `hoje=${home} lista=${listRow} hub=${hub} celular=${bar} sessão=${sessionCount}`
    test.info().annotations.push({ type: 'evidência', description: evidence })
    expect(new Set([home, listRow, hub, bar, sessionCount]).size, evidence).toBe(1)
    await ctx.close()
  })

  test('abrir o hub pede só resumo, materiais e a árvore: nenhum card nem conteúdo de nota', async ({ browser }) => {
    const { ctx, page, heavy } = await heavyPage(browser)
    test.skip(!heavy, 'seed pesado ausente')
    const api: string[] = []
    page.on('request', (r) => { if (r.url().includes(':8037/api/')) api.push(new URL(r.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '{id}')) })
    await gotoApp(page, `/cadernos/${heavy.id}`)
    await expect(materials(page).first()).toBeVisible()
    expect(api).toContain('/api/topics/{id}/summary')
    expect(api).toContain('/api/topics/{id}/materials')
    expect(api.filter(u => /\/notes|\/flashcards|\/details|\/documents/.test(u)), api.join(' ')).toEqual([])
    await ctx.close()
  })

  test('matéria aberta: a mesma tela com o escopo menor, o caminho e "Hoje" = sessão da matéria', async ({ browser }) => {
    const { ctx, page, heavy } = await heavyPage(browser)
    test.skip(!heavy, 'seed pesado ausente')
    await gotoApp(page, `/cadernos/${heavy.id}`)
    const rootTotal = num(await page.getByTestId('scope-materials').getByRole('heading').innerText(), /\((\d+)\)/)
    const row = page.getByTestId('subject-row').first()
    const label = (await row.getAttribute('aria-label'))!
    const name = label.split(',')[0]!
    const today = num(label, /(\d+) para hoje/)
    await row.click()
    await expect(header(page).getByRole('heading', { level: 1 })).toHaveText(name)
    await expect(header(page).getByRole('navigation', { name: 'Caminho' }).getByRole('link', { name: 'Direito — TRF (pesado)' })).toBeVisible()
    await expect(page.getByTestId('scope-subjects').getByRole('heading', { name: 'Assuntos' })).toBeVisible()
    const subTotal = num(await page.getByTestId('scope-materials').getByRole('heading').innerText(), /\((\d+)\)/)
    expect(subTotal).toBeLessThan(rootTotal)
    expect(num(await page.getByTestId('scope-review').innerText(), /· (\d+)/)).toBe(today)
    await expect(header(page)).toContainText(`já inclui estes ${today}`)
    await ctx.close()
  })

  test('materiais: 30 por página, "Carregar mais" com o foco na 1ª linha nova, busca e vazio da busca', async ({ browser }) => {
    const { ctx, page, heavy } = await heavyPage(browser)
    test.skip(!heavy, 'seed pesado ausente')
    await gotoApp(page, `/cadernos/${heavy.id}`)
    await expect(materials(page)).toHaveCount(30)
    const more = page.waitForResponse(r => r.url().includes('/materials') && r.url().includes('cursor='))
    await page.getByTestId('material-more').click()
    await more
    await expect(materials(page)).toHaveCount(60)
    await expect(materials(page).nth(30).getByTestId('material-title')).toBeFocused()

    const search = page.waitForResponse(r => r.url().includes('/materials') && r.url().includes('q=Lei'))
    await page.getByRole('searchbox', { name: 'Buscar nos materiais' }).fill('Lei seca')
    await search
    await expect(materials(page).first()).toBeVisible()
    for (const title of await materials(page).getByTestId('material-title').allInnerTexts()) expect(title).toMatch(/lei seca/i)

    await page.getByRole('searchbox', { name: 'Buscar nos materiais' }).fill('zzz-nada-assim')
    await expect(page.getByText('Nada com "zzz-nada-assim".')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(materials(page)).toHaveCount(30)
    await ctx.close()
  })
})

test.describe('Escopo do usuário (e2e-hub)', () => {
  test('"+ Adicionar" grava na matéria aberta: texto vira linha no topo; nota em branco abre o material', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { subject } = await caderno(page, {}, 0)
    await gotoApp(page, `/cadernos/${subject.id}`)
    await page.getByTestId('empty-text').click()
    const sheet = page.getByRole('dialog', { name: 'Colar texto' })
    await expect(sheet.getByText('Grava em Constitucional')).toBeVisible()
    const posted = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith(`/api/topics/${subject.id}/notes`))
    await sheet.getByRole('textbox', { name: 'Texto' }).fill('Remédios constitucionais\nHabeas corpus protege a liberdade de locomoção.')
    await sheet.getByRole('button', { name: 'Salvar nota' }).click()
    await posted
    await expect(materials(page).first()).toContainText('Remédios constitucionais')

    await page.getByTestId('scope-add-material').click()
    await page.getByRole('dialog', { name: 'Adicionar' }).getByRole('button', { name: /Nota em branco/ }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${subject.id}/material/[0-9a-f-]{36}$`))
    await expect(page.getByTestId('material-title-input')).toHaveText('Novo material')
  })

  test('PDF pelo "+ Adicionar": vai com o topic_id do escopo e "Criar cards" explícito; a linha entra no topo lendo', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { subject } = await caderno(page, {}, 0)
    const DOC = '00000000-0000-4000-8000-0000000000e1'
    const posts: Record<string, string>[] = []
    await page.route('**/api/documents', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
      posts.push(Object.fromEntries([...body.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)\r\n/g)].map(m => [m[1], m[2]])))
      await route.fulfill({ status: 201, json: { data: { id: DOC, original_name: 'aula.pdf', pages_count: 3, status: 'pending', topic_id: subject.id, note_generation_status: null, created_at: new Date().toISOString() }, topic_id: subject.id, topic_created: false, auto_generation: { dispatched: true } } })
    })
    await page.route(`**/api/documents/${DOC}`, route => route.fulfill({ json: { data: { id: DOC, original_name: 'aula.pdf', status: 'completed', note_generation_status: 'generating', note_generation_progress: 1, note_total_batches: 4 } } }))
    await gotoApp(page, `/cadernos/${subject.id}`)
    // Empty scope: the "+ Adicionar" of the TopNav (the material block is the empty one)
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    const sheet = page.getByRole('dialog', { name: 'Adicionar' })
    await expect(sheet.getByRole('combobox', { name: 'Gravar em' })).toHaveValue(subject.id)
    await sheet.getByRole('checkbox', { name: /Gerar cards automaticamente/ }).uncheck()
    const chooser = page.waitForEvent('filechooser')
    await sheet.getByRole('button', { name: /^PDF/ }).click()
    await (await chooser).setFiles({ name: 'aula.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') })
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: subject.id, auto_cards: '0' })
    await expect(materials(page).first()).toContainText('aula.pdf')
    await expect(materials(page).first()).toContainText(/Escrevendo a parte 1 de 2 · lote 2 de 4/, { timeout: 10_000 })
  })

  test('"+ Matéria" cria na tela; no 2º nível não há "+ Assunto"; o 3º nível dá 422 depth_exceeded dito no campo', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root, topic } = await caderno(page, {}, 0)
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.getByTestId('scope-add-subject').click()
    const dialog = page.getByRole('dialog', { name: 'Nova matéria' })
    await dialog.getByRole('textbox', { name: 'Nome da matéria' }).fill('Português')
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect(page.getByTestId('subject-row').filter({ hasText: 'Português' })).toBeVisible()

    await gotoApp(page, `/cadernos/${topic.id}`)
    await expect(header(page).getByRole('heading', { level: 1 })).toHaveText('Controle')
    await expect(page.getByTestId('scope-add-subject')).toHaveCount(0)
    const api = await apiCall(page, 'POST', '/topics', { name: 'Fundo', parent_id: topic.id }).catch((e: Error) => e.message)
    expect(String(api)).toMatch(/422.*depth_exceeded/)

    // The message on the field, if a 3rd level is ever asked from the screen
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.route('**/api/topics', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { message: 'Profundidade máxima.', code: 'depth_exceeded', errors: { parent_id: ['x'] } } })
      : route.fallback())
    await page.getByTestId('scope-add-subject').click()
    const again = page.getByRole('dialog', { name: 'Nova matéria' })
    await again.getByRole('textbox', { name: 'Nome da matéria' }).fill('Demais')
    await again.getByRole('button', { name: 'Criar' }).click()
    await expect(again.getByText(/último nível/)).toBeVisible()
    await expect(again.getByRole('textbox', { name: 'Nome da matéria' })).toHaveValue('Demais')
  })

  test('desempenho por assunto: acerto em questões (≥ 10 respondidas) na linha e no cabeçalho; "ponto fraco"', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root, subject } = await caderno(page, {}, 3)
    tinker(`
      $u = App\\Domain\\User\\Models\\User::where('email', '${USERS.hub.email}')->firstOrFail();
      $q = App\\Domain\\Quiz\\Models\\Quiz::create(['user_id' => $u->id, 'topic_id' => '${root.id}', 'title' => 'Simulado 4b', 'status' => 'completed', 'mode' => 'learning', 'config' => ['quantity' => 12, 'types' => ['true_false'], 'difficulty' => 'mixed'], 'total_questions' => 12, 'correct_count' => 6, 'score_percent' => 50, 'time_spent_seconds' => 60, 'started_at' => now()->subMinute(), 'completed_at' => now()]);
      for ($i = 1; $i <= 12; $i++) {
        App\\Domain\\Quiz\\Models\\QuizQuestion::create(['quiz_id' => $q->id, 'topic_id' => '${subject.id}', 'position' => $i, 'type' => 'true_false', 'difficulty' => 'easy', 'stem' => "Afirmação $i", 'explanation' => 'Gabarito.', 'correct_answer' => 'true', 'user_answer' => $i <= 6 ? 'true' : 'false', 'is_correct' => $i <= 6, 'answered_at' => now()]);
      }
    `)
    await gotoApp(page, `/cadernos/${root.id}`)
    const row = page.getByTestId('subject-row').filter({ hasText: 'Constitucional' })
    await expect(row).toHaveAttribute('aria-label', /acerto em questões 50%/)
    await expect(row).toContainText('ponto fraco')
    await expect(header(page)).toContainText('de acerto em 12 questões')
    await expect(page.getByTestId('subject-row').filter({ hasText: 'Controle' })).toHaveAttribute('aria-label', /faça 10 questões/)
  })

  test('vazio: um bloco só ("Adicionar ao caderno", primário em Enviar PDF); sem Praticar e sem número', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const root = (await apiCall(page, 'POST', '/topics', { name: `Vazio ${uid()}`, learning_mode: 'general' })).data
    await gotoApp(page, `/cadernos/${root.id}`)
    await expect(page.getByTestId('scope-empty')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: 'Adicionar ao caderno' })).toBeVisible()
    await expect(header(page)).toContainText('Comece adicionando o que você vai estudar.')
    await expect(page.getByTestId('scope-review')).toHaveCount(0)
    await expect(page.getByTestId('scope-practice')).toHaveCount(0)
    await expect(page.getByTestId('scope-next-step')).toHaveCount(0)
    await expect(page.locator('main .bg-action.text-on-action:visible')).toHaveCount(1)
    await expect(page.getByTestId('empty-pdf')).toHaveClass(/bg-action/)
  })

  test('modo concurso: Questões ao lado de Revisar; faculdade: Materiais antes de Matérias e Questões em Praticar', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const exam = await caderno(page, { learning_mode: 'exam' }, 3)
    await apiCall(page, 'POST', `/topics/${exam.root.id}/notes`, { title: 'Nota', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'texto' }] }] } })
    await gotoApp(page, `/cadernos/${exam.root.id}`)
    await expect(page.getByTestId('scope-quiz')).toHaveAttribute('href', `/simulados?topic_id=${exam.root.id}`)
    await expect(page.getByTestId('practice-quiz')).toContainText('Simulado cronometrado')

    const academic = await caderno(page, { learning_mode: 'academic' }, 3)
    await apiCall(page, 'POST', `/topics/${academic.root.id}/notes`, { title: 'Nota', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'texto' }] }] } })
    await gotoApp(page, `/cadernos/${academic.root.id}`)
    await expect(page.getByTestId('scope-quiz')).toHaveCount(0)
    await expect(page.getByTestId('practice-quiz')).toContainText('Questões')
    const order = await page.locator('[data-testid="scope-materials"], [data-testid="scope-subjects"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')))
    expect(order).toEqual(['scope-materials', 'scope-subjects'])
  })

  test('cada função antiga tem caminho novo: URLs antigas, material, biblioteca, mapa, editar e excluir com desfazer', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { root, subject } = await caderno(page, {}, 3)
    const note = (await apiCall(page, 'POST', `/topics/${subject.id}/notes`, { title: 'Nota antiga', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'conteúdo' }] }] } })).data

    // Old URLs (pending actions, e-mails, favorites)
    for (const [from, to] of [
      [`/cadernos?topic=${root.id}`, `/cadernos/${root.id}`],
      [`/cadernos?topic=${subject.id}&note=${note.id}`, `/cadernos/${subject.id}/material/${note.id}`],
      [`/cadernos?topic=${root.id}&tab=cards`, `/cadernos/${root.id}/cards`],
      [`/cadernos?topic=${root.id}&tab=map`, `/cadernos/${root.id}/mapa`],
    ]) {
      await gotoApp(page, from!)
      await expect(page, from).toHaveURL(new RegExp(`${to!.replace(/[?]/g, '\\?')}$`))
    }

    // Material: the editor autosaves; "‹ Constitucional" goes back to the hub
    await gotoApp(page, `/cadernos/${subject.id}/material/${note.id}`)
    await expect(page.getByTestId('material-title-input')).toHaveText('Nota antiga')
    const put = page.waitForRequest(r => r.method() === 'PUT' && r.url().endsWith(`/api/notes/${note.id}`))
    await page.locator('.ProseMirror').first().click()
    await page.keyboard.type(' mais')
    await put
    await page.getByRole('link', { name: 'Voltar a Constitucional' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${subject.id}$`))

    // Library: "Todos os cards (3)" from Praticar; create a card by hand
    await page.getByTestId('practice-cards').click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${subject.id}/cards$`))
    await expect(page.getByRole('heading', { name: 'Todos os cards' })).toBeVisible()
    await expect(page.getByText('Pergunta 0')).toBeVisible()

    // Map from Praticar
    await gotoApp(page, `/cadernos/${subject.id}`)
    await page.getByTestId('practice-map').click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${subject.id}/mapa$`))

    // ⋯ of the scope: Relâmpago, Só erros, Editar (rename) and Excluir with Desfazer
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.getByRole('button', { name: `Mais ações de ${root.name}` }).click()
    await expect(page.getByRole('menuitem', { name: 'Relâmpago' })).toBeVisible()
    await page.getByRole('menuitem', { name: /^Editar/ }).click()
    const edit = page.getByRole('dialog', { name: 'Editar caderno' })
    await edit.getByRole('textbox', { name: 'Nome do caderno' }).fill(`${root.name} 2`)
    await edit.getByRole('button', { name: 'Salvar' }).click()
    await expect(header(page).getByRole('heading', { level: 1 })).toHaveText(`${root.name} 2`)

    await page.getByRole('button', { name: `Mais ações de ${root.name} 2` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByText(/2 matérias|1 matéria/)).toBeVisible()
    await confirm.getByRole('button', { name: 'Mandar para a lixeira' }).click()
    await expect(page).toHaveURL(/\/cadernos$/)
    await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${root.id}$`))
    expect(((await apiCall(page, 'GET', '/topics')).data as any[]).some(t => t.id === root.id)).toBe(true)
  })
})

test.describe('Celular 390', () => {
  test('título inteiro, barra fixa com o mesmo número e ⚡, blocos sem rolagem horizontal', async ({ browser }) => {
    const { ctx, page, heavy } = await heavyPage(browser, { width: 390, height: 844 })
    test.skip(!heavy, 'seed pesado ausente')
    await gotoApp(page, `/cadernos/${heavy.id}`)
    const bar = page.getByTestId('scope-review-bar')
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: /Relâmpago/ })).toHaveAttribute('href', `/revisar?mode=blitz&topic_id=${heavy.id}`)
    const box = await bar.boundingBox()
    const nav = await page.getByRole('navigation', { name: 'Navegação mobile' }).boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y + 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    // Touch targets of the material lines
    const review = materials(page).first().getByRole('link', { name: /^Revisar \d+$/ }).first()
    if (await review.count()) expect((await review.boundingBox())!.height).toBeGreaterThanOrEqual(36)
    // Inside the material the bar is gone
    await materials(page).first().getByTestId('material-title').click()
    await expect(page.getByTestId('material-reader')).toBeVisible()
    await expect(page.getByTestId('scope-review-bar')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Acessibilidade do hub (axe, dados reais)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1440, 390]) {
      test(`${width}px ${theme}: lista, hub, matéria, material, cards e mapa sem violações serious/critical`, async ({ browser }) => {
        const { ctx, page, heavy } = await heavyPage(browser, { width, height: 900 })
        test.skip(!heavy, 'seed pesado ausente')
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        const summary = (await apiCall(page, 'GET', `/topics/${heavy.id}/summary`)).data
        const firstMaterial = (await apiCall(page, 'GET', `/topics/${heavy.id}/materials?limit=1`)).data[0]
        const paths = [
          '/cadernos',
          `/cadernos/${heavy.id}`,
          `/cadernos/${summary.subjects[0].id}`,
          `/cadernos/${firstMaterial.topic.id}/material/${firstMaterial.note_id}`,
          `/cadernos/${heavy.id}/cards`,
          `/cadernos/${heavy.id}/mapa`,
        ]
        const out: string[] = []
        for (const path of paths) {
          await gotoApp(page, path)
          await page.waitForTimeout(500)
          const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          for (const v of results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')) {
            out.push(`${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '{id}')} ${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)
          }
        }
        expect(out).toEqual([])
        await ctx.close()
      })
    }
  }
})
