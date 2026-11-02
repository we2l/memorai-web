import { test, expect, gotoApp, apiCall, uid, type UserKey } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Caderno: criar, renomear, excluir com confirmação e desfazer, matéria e PDF no escopo.
 * Desde a 4b-1 (prd-4b-caderno-v3) a lista fica em /cadernos e cada caderno é um hub em /cadernos/{id}:
 * o ⋯ do cabeçalho tem Editar e Excluir; "+ Matéria" fica no bloco Matérias; o PDF entra pelo "+ Adicionar".
 * Usuário próprio (e2e-pro@audit.test), recriado a cada execução.
 */
test.use({ auditUser: 'pro' as UserKey })

async function topicsByName(page: Page, name: string) {
  const res = await apiCall(page, 'GET', '/topics')
  const flat: any[] = []
  const walk = (ts: any[]) => ts.forEach((t) => { flat.push(t); walk(t.children ?? []) })
  walk(res.data)
  return flat.filter(t => t.name === name)
}

const title = (page: Page) => page.getByTestId('scope-header').getByRole('heading', { level: 1 })
const listRow = (page: Page, name: string) => page.getByTestId('notebook-list').getByRole('link', { name: new RegExp(`^${name}`) })

async function createViaUi(page: Page, name: string) {
  await page.getByRole('button', { name: /Novo caderno|Criar caderno/ }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Novo caderno' })
  await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill(name)
  await dialog.getByRole('button', { name: 'Criar' }).click()
  return dialog
}

async function menuAction(page: Page, name: string, action: 'Editar' | 'Excluir') {
  await page.getByRole('button', { name: `Mais ações de ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${action}`) }).click()
}

test.describe('Caderno — caminho feliz', () => {
  test('criar → abre o hub → renomear → excluir (confirmação) → desfazer mantém no servidor', async ({ page }) => {
    const name = `Caderno ${uid()}`
    await gotoApp(page, '/cadernos')

    const dialog = await createViaUi(page, name)
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('status').getByText('Caderno criado!')).toBeVisible()
    await expect(title(page)).toHaveText(name)
    expect(await topicsByName(page, name)).toHaveLength(1)

    const renamed = `${name} renomeado`
    await menuAction(page, name, 'Editar')
    const edit = page.getByRole('dialog', { name: 'Editar caderno' })
    await edit.getByRole('textbox', { name: 'Nome do caderno' }).fill(renamed)
    await edit.getByRole('button', { name: 'Salvar' }).click()
    await expect(edit).toBeHidden()
    await expect(title(page)).toHaveText(renamed)
    expect(await topicsByName(page, renamed)).toHaveLength(1)

    // Excluir: a confirmação diz o que vai junto e dá 10 s para desfazer; a tela volta à lista
    await menuAction(page, renamed, 'Excluir')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('heading', { name: `Excluir '${renamed}'?` })).toBeVisible()
    await expect(confirm.getByText(/0 materiais e 0 cards.*10 segundos para desfazer/)).toBeVisible()
    await confirm.getByRole('button', { name: 'Excluir' }).click()
    await expect(page).toHaveURL(/\/cadernos$/)
    await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click()
    await expect(title(page)).toHaveText(renamed)
    await page.waitForTimeout(11_000)
    expect(await topicsByName(page, renamed)).toHaveLength(1)
  })

  test('excluir sem desfazer: o DELETE sai na janela de 10 s, mesmo trocando de página', async ({ page }) => {
    const name = `Excluir ${uid()}`
    await gotoApp(page, '/cadernos')
    const t = await apiCall(page, 'POST', '/topics', { name })
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await menuAction(page, name, 'Excluir')
    const deleted = page.waitForRequest(r => r.method() === 'DELETE' && /\/api\/topics\//.test(r.url()), { timeout: 15_000 })
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('navigation', { name: 'Navegação principal' }).first().getByRole('link', { name: 'Hoje' }).click()
    await deleted
    await expect.poll(async () => (await topicsByName(page, name)).length).toBe(0)
  })

  test('"+ Matéria" cria a matéria dentro do caderno (antes "Adicionar assunto" da árvore, 04/B7)', async ({ page }) => {
    const parent = `Pai ${uid()}`
    await gotoApp(page, '/cadernos')
    const t = await apiCall(page, 'POST', '/topics', { name: parent })
    await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Material', content: null })
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('scope-add-subject').click()
    const dialog = page.getByRole('dialog', { name: 'Nova matéria' })
    await dialog.getByRole('textbox', { name: 'Nome da matéria' }).fill('Filho 1')
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect.poll(async () => (await topicsByName(page, parent))[0]?.children?.map((c: any) => c.name)).toEqual(['Filho 1'])
    await expect(page.getByTestId('subject-row').filter({ hasText: 'Filho 1' })).toBeVisible()
  })
})

test.describe('Caderno — caminho triste', () => {
  test('nome vazio não habilita Criar nem Salvar', async ({ page }) => {
    const name = `Vazio ${uid()}`
    await gotoApp(page, '/cadernos')
    const t = await apiCall(page, 'POST', '/topics', { name })
    await page.reload()
    await page.getByRole('button', { name: 'Novo caderno' }).click()
    const dialog = page.getByRole('dialog', { name: 'Novo caderno' })
    await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill('   ')
    await expect(dialog.getByRole('button', { name: 'Criar' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()

    await gotoApp(page, `/cadernos/${t.data.id}`)
    await menuAction(page, name, 'Editar')
    const edit = page.getByRole('dialog', { name: 'Editar caderno' })
    await edit.getByRole('textbox', { name: 'Nome do caderno' }).fill('')
    await expect(edit.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  test('caderno com ≥ 50 cards exige digitar o nome para excluir', async ({ page }) => {
    const name = `Grande ${uid()}`
    await gotoApp(page, '/cadernos')
    const topic = await apiCall(page, 'POST', '/topics', { name })
    const cards = Array.from({ length: 50 }, (_, i) => ({ front: `F${i}`, back: `B${i}` }))
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.data.id, cards })
    await gotoApp(page, `/cadernos/${topic.data.id}`)
    await menuAction(page, name, 'Excluir')
    const confirm = page.getByRole('alertdialog')
    const button = confirm.getByRole('button', { name: 'Excluir' })
    await expect(button).toBeDisabled()
    await confirm.getByRole('textbox').fill('outro nome')
    await expect(button).toBeDisabled()
    await confirm.getByRole('textbox').fill(name)
    await expect(button).toBeEnabled()
    await confirm.getByRole('button', { name: 'Cancelar' }).click()
    expect(await topicsByName(page, name)).toHaveLength(1)
  })

  test('falha da API ao criar: usuário recebe erro e não perde o nome digitado', async ({ page }) => {
    const name = `Falha ${uid()}`
    await gotoApp(page, '/cadernos')
    await page.route('**/api/topics', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    const dialog = await createViaUi(page, name)
    await expect(dialog.getByRole('textbox', { name: 'Nome do caderno' })).toHaveValue(name)
    await expect(page.getByRole('alert').filter({ hasText: /não foi possível|erro|tente/i })).toBeVisible({ timeout: 5000 })
  })

  test('falha da API ao excluir: o caderno volta para a lista com aviso', async ({ page }) => {
    const name = `NaoExclui ${uid()}`
    await gotoApp(page, '/cadernos')
    const t = await apiCall(page, 'POST', '/topics', { name })
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.route('**/api/topics/*', route => route.request().method() === 'DELETE'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await menuAction(page, name, 'Excluir')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page).toHaveURL(/\/cadernos$/)
    await expect(page.getByRole('alert').getByText(`Não foi possível excluir "${name}".`)).toBeVisible({ timeout: 15_000 })
    await page.reload()
    await expect(listRow(page, name)).toBeVisible()
  })

  // Lacuna de produto até a 4b-2 (RF-F15 "Mover para…"): reativar quando existir.
  test.fixme('mover caderno/matéria para outro caderno: a interface oferece a ação', async ({ page }) => {
    const name = `Mover ${uid()}`
    await gotoApp(page, '/cadernos')
    const t = await apiCall(page, 'POST', '/topics', { name })
    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByRole('button', { name: `Mais ações de ${name}`, exact: true }).click()
    await expect(page.getByRole('menuitem', { name: /Mover/i })).toBeVisible({ timeout: 2000 })
  })
})

test.describe('Caderno — PDF no escopo (upload interceptado, sem IA)', () => {
  const PDF = { name: 'aula.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') }
  const FAKE_DOC = '00000000-0000-4000-8000-0000000000d1'

  /** POST /documents answered by the test (nothing stored, no job, no AI): records the multipart fields. */
  async function interceptUpload(page: Page) {
    const posts: Record<string, string>[] = []
    await page.route('**/api/documents', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
      const fields = Object.fromEntries([...body.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)\r\n/g)].map(m => [m[1], m[2]]))
      posts.push(fields)
      const topicId = fields.topic_id || null
      const doc = { id: FAKE_DOC, original_name: PDF.name, file_size: PDF.buffer.length, pages_count: 1, processed_pages: 1, status: 'completed', topic_id: topicId, note_generation_status: 'completed', has_generated_note: true, auto_cards: fields.auto_cards === '1', auto_cards_status: null, created_at: new Date().toISOString() }
      await route.fulfill({ status: 201, json: { data: doc, topic_id: topicId, topic_created: !topicId, auto_generation: null } })
    })
    await page.route(`**/api/documents/${FAKE_DOC}`, route => route.fulfill({ json: { data: { id: FAKE_DOC, status: 'completed', note_generation_status: 'completed', has_generated_note: true } } }))
    return posts
  }

  async function subTopic(page: Page, rootBody: Record<string, unknown>) {
    await gotoApp(page, '/hoje')
    const root = await apiCall(page, 'POST', '/topics', { name: `Raiz ${uid()}`, ...rootBody })
    const child = await apiCall(page, 'POST', '/topics', { name: `Sub ${uid()}`, parent_id: root.data.id })
    return { rootId: root.data.id as string, childId: child.data.id as string }
  }

  test('matéria herda o modo da raiz: sem modal, o PDF vai com o topic_id dela e o "Criar cards" da escolha', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('baigi-auto-cards', '0')) // "Criar cards" desmarcado antes
    const { childId } = await subTopic(page, { learning_mode: 'academic' })
    const posts = await interceptUpload(page)
    await gotoApp(page, `/cadernos/${childId}`)
    const chooser = page.waitForEvent('filechooser')
    await page.getByTestId('empty-pdf').click()
    await (await chooser).setFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    await expect(page.getByRole('dialog', { name: 'Modo de estudo' })).toHaveCount(0)
    expect(posts[0]).toMatchObject({ topic_id: childId, auto_cards: '0' })
  })

  test('caderno sem modo: o PDF entra nele sem perguntar (o modo fica no ⋯ Editar), nenhum caderno novo', async ({ page }) => {
    const { childId } = await subTopic(page, {})
    const posts = await interceptUpload(page)
    await gotoApp(page, `/cadernos/${childId}`)
    await page.getByTestId('scope-empty').getByRole('checkbox', { name: /Criar cards dos PDFs/ }).uncheck()
    const chooser = page.waitForEvent('filechooser')
    await page.getByTestId('empty-pdf').click()
    await (await chooser).setFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: childId, auto_cards: '0' })
    expect((await apiCall(page, 'GET', '/topics')).data.filter((t: any) => t.name === PDF.name.replace('.pdf', ''))).toHaveLength(0)
    await expect(page.getByTestId('material-row').first()).toContainText(PDF.name)
  })

  test('"Enviar PDF" do caderno vazio abre o upload, não o editor de nota', async ({ page }) => {
    const { childId } = await subTopic(page, { learning_mode: 'general' })
    const posts = await interceptUpload(page)
    let notePosts = 0
    page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/topics\/[^/]+\/notes$/.test(r.url())) notePosts++ })
    await gotoApp(page, `/cadernos/${childId}`)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Enviar PDF/ }).click()
    await (await chooser).setFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: childId })
    expect(['0', '1']).toContain(posts[0]!.auto_cards)
    expect(notePosts).toBe(0)
    await expect(page.getByTestId('material-title-input')).toHaveCount(0)
  })

  test('"+ Adicionar → PDF" da lista grava num caderno escolhido, com "Criar cards" explícito (nunca cria caderno)', async ({ page }) => {
    const { rootId } = await subTopic(page, { learning_mode: 'general' })
    const posts = await interceptUpload(page)
    await gotoApp(page, '/cadernos')
    await expect(page.getByRole('button', { name: /Importar PDF/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Adicionar' }).first().click()
    const sheet = page.getByRole('dialog', { name: 'Adicionar' })
    await sheet.getByRole('combobox', { name: 'Gravar em' }).selectOption(rootId)
    await sheet.getByRole('checkbox', { name: /Criar cards dos PDFs/ }).uncheck()
    const chooser = page.waitForEvent('filechooser')
    await sheet.getByRole('button', { name: /^PDF/ }).click()
    await (await chooser).setFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: rootId, auto_cards: '0' })
    await expect(page).toHaveURL(new RegExp(`/cadernos/${rootId}$`))
  })
})
