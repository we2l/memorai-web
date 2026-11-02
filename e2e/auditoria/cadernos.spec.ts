import { test, expect, gotoApp, apiCall, uid, type UserKey } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Caderno: criar, renomear, (mover), excluir com confirmação e desfazer.
 * Usuário próprio (e2e-pro@audit.test), recriado a cada execução.
 */
test.use({ auditUser: 'pro' as UserKey })

const treeItem = (page: Page, name: string) => page.getByRole('complementary').getByRole('button', { name: new RegExp(`^${name}`) })

async function topicsByName(page: Page, name: string) {
  const res = await apiCall(page, 'GET', '/topics')
  const flat: any[] = []
  const walk = (ts: any[]) => ts.forEach((t) => { flat.push(t); walk(t.children ?? []) })
  walk(res.data)
  return flat.filter(t => t.name === name)
}

async function createViaUi(page: Page, name: string) {
  await page.getByRole('button', { name: 'Novo', exact: true }).click()
  await page.getByRole('button', { name: 'Novo caderno' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Criar caderno' })
  await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill(name)
  await dialog.getByRole('button', { name: 'Criar' }).click()
  return dialog
}

async function menuAction(page: Page, name: string, action: 'Editar' | 'Excluir' | 'Adicionar assunto') {
  await page.getByRole('button', { name: `Opções de ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

test.describe('Caderno — caminho feliz', () => {
  test('criar → renomear → excluir (confirmação) → desfazer mantém no servidor', async ({ page }) => {
    const name = `Caderno ${uid()}`
    await gotoApp(page, '/cadernos')

    const dialog = await createViaUi(page, name)
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('status').getByText('Caderno criado!')).toBeVisible()
    await expect(treeItem(page, name)).toBeVisible()
    expect(await topicsByName(page, name)).toHaveLength(1)

    // Renomear
    const renamed = `${name} renomeado`
    await menuAction(page, name, 'Editar')
    const edit = page.getByRole('dialog', { name: 'Editar' })
    await edit.getByRole('textbox').fill(renamed)
    await edit.getByRole('button', { name: 'Salvar' }).click()
    await expect(edit).toBeHidden()
    await expect(treeItem(page, renamed)).toBeVisible()
    expect(await topicsByName(page, renamed)).toHaveLength(1)

    // Excluir: confirmação explica o que some e oferece 10 s para desfazer
    await menuAction(page, renamed, 'Excluir')
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('heading', { name: `Excluir '${renamed}'?` })).toBeVisible()
    await expect(confirm.getByText(/0 notas.*0 cards.*10 segundos para desfazer/)).toBeVisible()
    await confirm.getByRole('button', { name: 'Excluir' }).click()
    await expect(treeItem(page, renamed)).toBeHidden()

    await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click()
    await expect(treeItem(page, renamed)).toBeVisible()
    // Passada a janela de 10 s, nada foi apagado no servidor
    await page.waitForTimeout(11_000)
    expect(await topicsByName(page, renamed)).toHaveLength(1)
  })

  test('excluir sem desfazer: DELETE sai ao trocar de página e o caderno some do servidor', async ({ page }) => {
    const name = `Excluir ${uid()}`
    await gotoApp(page, '/cadernos')
    await apiCall(page, 'POST', '/topics', { name })
    await page.reload()
    await menuAction(page, name, 'Excluir')
    const deleted = page.waitForRequest(r => r.method() === 'DELETE' && /\/api\/topics\//.test(r.url()))
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Hoje' }).click()
    await deleted
    await expect.poll(async () => (await topicsByName(page, name)).length).toBe(0)
  })

  // Era BUG (04/B7): `canAddChild?: boolean` virava false pelo cast booleano do Vue e o item sumia.
  // Corrigido na F1 (prd-caderno-f1-pontes RF-F6): a prop é obrigatória e vem da profundidade.
  test('subtópico: "Adicionar assunto" cria filho dentro do caderno', async ({ page }) => {
    const parent = `Pai ${uid()}`
    await gotoApp(page, '/cadernos')
    await apiCall(page, 'POST', '/topics', { name: parent })
    await page.reload()
    await page.getByRole('button', { name: `Opções de ${parent}`, exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Adicionar assunto' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('menuitem', { name: 'Adicionar assunto' }).click()
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') })
    await dialog.getByRole('textbox').first().fill('Filho 1')
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect.poll(async () => (await topicsByName(page, parent))[0]?.children?.map((c: any) => c.name)).toEqual(['Filho 1'])
  })
})

test.describe('Caderno — caminho triste', () => {
  test('nome vazio não habilita Criar nem Salvar', async ({ page }) => {
    const name = `Vazio ${uid()}`
    await gotoApp(page, '/cadernos')
    await page.getByRole('button', { name: 'Novo', exact: true }).click()
    await page.getByRole('button', { name: 'Novo caderno' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Criar caderno' })
    await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill('   ')
    await expect(dialog.getByRole('button', { name: 'Criar' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()

    await apiCall(page, 'POST', '/topics', { name })
    await page.reload()
    await menuAction(page, name, 'Editar')
    const edit = page.getByRole('dialog', { name: 'Editar' })
    await edit.getByRole('textbox').fill('')
    await expect(edit.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  test('caderno com ≥ 50 cards exige digitar o nome para excluir', async ({ page }) => {
    const name = `Grande ${uid()}`
    await gotoApp(page, '/cadernos')
    const topic = await apiCall(page, 'POST', '/topics', { name })
    const cards = Array.from({ length: 50 }, (_, i) => ({ front: `F${i}`, back: `B${i}` }))
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: topic.data.id, cards })
    await page.reload()
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
    // BUG: handleCreateTopic (pages/cadernos/index.vue) não trata o erro — nenhum aviso aparece
    await expect(page.getByRole('alert').filter({ hasText: /não foi possível|erro|tente/i })).toBeVisible({ timeout: 5000 })
  })

  test('falha da API ao excluir: caderno volta para a árvore com aviso', async ({ page }) => {
    const name = `NaoExclui ${uid()}`
    await gotoApp(page, '/cadernos')
    await apiCall(page, 'POST', '/topics', { name })
    await page.reload()
    await page.route('**/api/topics/*', route => route.request().method() === 'DELETE'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await menuAction(page, name, 'Excluir')
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(treeItem(page, name)).toBeHidden()
    // Força o envio (flush) sem sair da página: pagehide não é simulável, então espera a janela
    await expect(treeItem(page, name)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert').getByText(`Não foi possível excluir "${name}".`)).toBeVisible()
  })

  // Lacuna de produto, não de teste: o menu do tópico só tem Adicionar assunto/Editar/Excluir
  // (TreeItemMenu.vue) e a árvore não tem drag-and-drop. Reativar quando "Mover" existir.
  test.fixme('mover caderno/tópico para outro caderno: a interface oferece a ação', async ({ page }) => {
    const name = `Mover ${uid()}`
    await gotoApp(page, '/cadernos')
    await apiCall(page, 'POST', '/topics', { name })
    await page.reload()
    await page.getByRole('button', { name: `Opções de ${name}`, exact: true }).click()
    await expect(page.getByRole('menuitem', { name: /Mover/i })).toBeVisible({ timeout: 2000 })
  })
})

test.describe('Caderno — importar PDF (upload interceptado, sem IA)', () => {
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
      const doc = { id: FAKE_DOC, original_name: PDF.name, file_size: PDF.buffer.length, pages_count: 1, processed_pages: 1, status: 'completed', topic_id: topicId, note_generation_status: 'completed', auto_cards: fields.auto_cards === '1', auto_cards_status: null, created_at: new Date().toISOString() }
      await route.fulfill({ status: 201, json: { data: doc, topic_id: topicId, topic_created: !topicId, auto_generation: null } })
    })
    await page.route(`**/api/documents/${FAKE_DOC}`, route => route.fulfill({ json: { data: { id: FAKE_DOC, note_generation_status: 'completed' } } }))
    return posts
  }

  async function subTopic(page: Page, rootBody: Record<string, unknown>) {
    await gotoApp(page, '/hoje')
    const root = await apiCall(page, 'POST', '/topics', { name: `Raiz ${uid()}`, ...rootBody })
    const child = await apiCall(page, 'POST', '/topics', { name: `Sub ${uid()}`, parent_id: root.data.id })
    return { rootId: root.data.id as string, childId: child.data.id as string }
  }

  const openMaterial = async (page: Page, topicId: string) => {
    await gotoApp(page, `/cadernos?topic=${topicId}&tab=notes`)
    await page.getByRole('tab', { name: /^Material/ }).click()
  }

  test('sub-caderno herda o modo da raiz: sem modal, o PDF vai com o topic_id dele e auto_cards da escolha', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('baigi-auto-cards', '0')) // "Criar cards" desmarcado antes
    const { childId } = await subTopic(page, { learning_mode: 'academic' })
    const posts = await interceptUpload(page)
    await openMaterial(page, childId)
    await page.locator('.start-card input[type="file"]').setInputFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    await expect(page.getByRole('dialog', { name: 'Modo de estudo' })).toBeHidden()
    expect(posts[0]).toMatchObject({ topic_id: childId, auto_cards: '0' })
  })

  test('caderno sem modo: o modal salva o modo nele e o PDF entra nele, com "Criar cards" desmarcado', async ({ page }) => {
    const { childId } = await subTopic(page, {})
    const posts = await interceptUpload(page)
    const puts: any[] = []
    page.on('request', (r) => { if (r.method() === 'PUT' && r.url().endsWith(`/api/topics/${childId}`)) puts.push(r.postDataJSON()) })
    await openMaterial(page, childId)
    await page.locator('.start-card input[type="file"]').setInputFiles(PDF)
    const modal = page.getByRole('dialog', { name: 'Modo de estudo' })
    await modal.getByRole('button', { name: /Faculdade \/ Escola/ }).click()
    await modal.getByRole('checkbox', { name: /Criar cards automaticamente/ }).uncheck()
    await modal.locator('input[type="file"]').setInputFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: childId, auto_cards: '0' })
    expect(puts[0]).toMatchObject({ learning_mode: 'academic' })
    // Nenhum caderno novo
    expect((await apiCall(page, 'GET', '/topics')).data.filter((t: any) => t.name === PDF.name.replace('.pdf', ''))).toHaveLength(0)
  })

  test('"Enviar PDF" do caderno vazio abre o upload, não o editor de nota', async ({ page }) => {
    const { childId } = await subTopic(page, { learning_mode: 'general' })
    const posts = await interceptUpload(page)
    let notePosts = 0
    page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/topics\/[^/]+\/notes$/.test(r.url())) notePosts++ })
    await openMaterial(page, childId)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Enviar PDF/ }).click()
    await (await chooser).setFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ topic_id: childId })
    expect(['0', '1']).toContain(posts[0]!.auto_cards)
    expect(notePosts).toBe(0)
    await expect(page.locator('.notion-title')).toHaveCount(0)
  })

  test('"Novo → Importar PDF" com "Criar cards" desmarcado manda auto_cards=0 (caderno criado pelo arquivo)', async ({ page }) => {
    const posts = await interceptUpload(page)
    await gotoApp(page, '/cadernos')
    await page.getByRole('button', { name: 'Novo', exact: true }).click()
    await page.getByRole('button', { name: /Importar PDF/ }).click()
    const modal = page.getByRole('dialog', { name: 'Modo de estudo' })
    await modal.getByRole('checkbox', { name: /Criar cards automaticamente/ }).uncheck()
    await modal.locator('input[type="file"]').setInputFiles(PDF)
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]!.auto_cards).toBe('0')
    expect(posts[0]!.topic_id).toBeUndefined()
  })
})
