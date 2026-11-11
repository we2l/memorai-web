import { test, expect, gotoApp, apiCall, uid, doc, API, WEB } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Nota: criar, editar (título + corpo), salvar (autosave 1 s) e perder conexão no meio.
 */
test.use({ auditUser: 'pro' })

const editor = (page: Page) => page.locator('.ProseMirror').first()
const title = (page: Page) => page.getByTestId('material-title-input')
const saveIndicator = (page: Page) => page.getByRole('main').getByText(/^(Salvando\.\.\.|Salvo)$/)
const notSaved = (page: Page) => page.getByRole('alert').filter({ hasText: 'Não salvo' })

/** The hub of the caderno lists the material; its title opens the material route (4b-1). */
async function openNote(page: Page, topicId: string, noteTitle: string) {
  await gotoApp(page, `/cadernos/${topicId}`)
  await page.getByTestId('material-row').filter({ hasText: noteTitle }).getByTestId('material-title').click()
  await expect(editor(page)).toBeVisible()
}

async function newTopic(page: Page) {
  await gotoApp(page, '/hoje')
  const t = await apiCall(page, 'POST', '/topics', { name: `Notas ${uid()}` })
  return t.data.id as string
}

async function noteText(page: Page, noteId: string) {
  const res = await apiCall(page, 'GET', `/notes/${noteId}`)
  return { title: res.data.title as string, text: JSON.stringify(res.data.content ?? null) }
}

test.describe('Nota — caminho feliz', () => {
  test('criar → editar título e corpo → autosave persiste após recarregar', async ({ page }) => {
    const topicId = await newTopic(page)
    await gotoApp(page, `/cadernos/${topicId}`)

    const created = page.waitForResponse(r => r.request().method() === 'POST' && /\/topics\/[^/]+\/notes$/.test(r.url()))
    await page.getByTestId('empty-note').click()
    const note = (await (await created).json()).data
    await expect(editor(page)).toBeVisible()

    await title(page).click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('Revolução Francesa')
    const titleSaved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${note.id}`))
    await page.keyboard.press('Enter') // Enter leva ao corpo; o blur do título salva
    await titleSaved

    const bodySaved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${note.id}`) && (r.request().postData() ?? '').includes('Queda da Bastilha'))
    await editor(page).click()
    await page.keyboard.type('Queda da Bastilha em 1789.')
    expect((await bodySaved).status()).toBe(200)
    await expect(saveIndicator(page)).toHaveText('Salvo')

    const saved = await noteText(page, note.id)
    expect(saved.title).toBe('Revolução Francesa')
    expect(saved.text).toContain('Queda da Bastilha em 1789.')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Revolução Francesa').first()).toBeVisible()
  })

  test('editar nota existente e excluir com confirmação', async ({ page }) => {
    const topicId = await newTopic(page)
    const n = await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota para excluir', content: doc('conteúdo antigo') })
    await openNote(page, topicId, 'Nota para excluir')
    await expect(editor(page)).toContainText('conteúdo antigo')

    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Excluir nota' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('heading', { name: 'Mandar “Nota para excluir” para a lixeira?' })).toBeVisible()
    await confirm.getByRole('button', { name: 'Cancelar' }).click()
    expect((await noteText(page, n.data.id)).title).toBe('Nota para excluir')

    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Excluir nota' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mandar para a lixeira' }).click()
    await expect(page.getByRole('status').getByText('“Nota para excluir” foi para a lixeira.')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${topicId}$`))
    const res = await page.context().request.get(`${API}/notes/${n.data.id}`, { headers: { Accept: 'application/json', Origin: WEB, Referer: `${WEB}/` } })
    expect(res.status()).toBe(404)
  })
})

test.describe('Nota — navegação e acessibilidade', () => {
  test('recarregar a rota do material reabre a nota que estava aberta', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota do link', content: doc('corpo do link') })
    await openNote(page, topicId, 'Nota do link')
    await expect(page).toHaveURL(new RegExp(`/cadernos/${topicId}/material/[0-9a-f-]{36}$`))
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(editor(page)).toContainText('corpo do link')
  })

  test('nota da lista abre pelo teclado (Tab + Enter)', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota teclado', content: doc('abre com Enter') })
    await gotoApp(page, `/cadernos/${topicId}`)
    // The title of the material line is a link (it was a <div @click> without keyboard, HubNotesTab.vue)
    const link = page.getByTestId('material-row').filter({ hasText: 'Nota teclado' }).getByRole('link', { name: 'Nota teclado' })
    await expect(link).toBeVisible()
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(editor(page)).toContainText('abre com Enter')
  })
})

test.describe('Nota — caminho triste (conexão)', () => {
  test('autosave falha (offline): usuário é avisado e o texto não é dado como salvo', async ({ page }) => {
    const topicId = await newTopic(page)
    const n = await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Offline', content: doc('início') })
    await openNote(page, topicId, 'Offline')
    await expect(editor(page)).toContainText('início')

    // Conexão cai só para o salvamento
    await page.route(`**/api/notes/${n.data.id}`, route => route.request().method() === 'PUT' ? route.abort('internetdisconnected') : route.fallback())
    const failed = page.waitForEvent('requestfailed', r => r.method() === 'PUT' && r.url().endsWith(`/notes/${n.data.id}`))
    await editor(page).click()
    await page.keyboard.press('End')
    await page.keyboard.type(' parágrafo escrito sem rede')
    await failed

    // Servidor não recebeu o texto, e a tela diz isso (B13: o indicador voltava para "✓")
    expect((await noteText(page, n.data.id)).text).not.toContain('sem rede')
    await expect(notSaved(page)).toBeVisible({ timeout: 3000 })
    await expect(saveIndicator(page)).toHaveCount(0)

    // A rede volta: "Tentar de novo" envia o texto pendente
    await page.unroute(`**/api/notes/${n.data.id}`)
    const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${n.data.id}`))
    await notSaved(page).getByRole('button', { name: 'Tentar de novo' }).click()
    expect((await saved).status()).toBe(200)
    await expect(saveIndicator(page)).toHaveText('Salvo')
    expect((await noteText(page, n.data.id)).text).toContain('parágrafo escrito sem rede')
  })

  test('PUT 500 no autosave: "Não salvo" e nova tentativa automática salva o texto', async ({ page }) => {
    const topicId = await newTopic(page)
    const n = await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Erro 500', content: doc('base') })
    await openNote(page, topicId, 'Erro 500')
    let fail = true
    await page.route(`**/api/notes/${n.data.id}`, route => fail && route.request().method() === 'PUT'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    const failed = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${n.data.id}`))
    await editor(page).click()
    await page.keyboard.press('End')
    await page.keyboard.type(' depois do 500')
    expect((await failed).status()).toBe(500)
    await expect(notSaved(page)).toBeVisible()

    fail = false
    // Backoff: a primeira nova tentativa sai 2 s depois da falha, sem ação da pessoa
    const retried = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${n.data.id}`) && r.status() === 200, { timeout: 6000 })
    expect((await retried).status()).toBe(200)
    await expect(saveIndicator(page)).toHaveText('Salvo')
    expect((await noteText(page, n.data.id)).text).toContain('depois do 500')
  })

  test('volta da rede: próxima edição salva também o que foi digitado offline', async ({ page }) => {
    const topicId = await newTopic(page)
    const n = await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Reconecta', content: doc('base') })
    await openNote(page, topicId, 'Reconecta')
    await expect(editor(page)).toContainText('base')

    await page.context().setOffline(true)
    await editor(page).click()
    await page.keyboard.press('End')
    await page.keyboard.type(' OFFLINE')
    await page.waitForTimeout(1800) // debounce (1 s) + tentativa falha
    await page.context().setOffline(false)

    const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/notes/${n.data.id}`))
    await page.keyboard.type(' ONLINE')
    expect((await saved).status()).toBe(200)
    const text = (await noteText(page, n.data.id)).text
    expect(text).toContain('OFFLINE')
    expect(text).toContain('ONLINE')
  })

  test('erro 500 ao abrir os materiais do caderno mostra erro com "Tentar de novo"', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota visível', content: doc('x') })
    let fail = true
    await page.route(`**/api/topics/${topicId}/materials**`, route => fail && route.request().method() === 'GET'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await gotoApp(page, `/cadernos/${topicId}`)
    const error = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os materiais' })
    await expect(error).toBeVisible()
    fail = false
    await error.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText('Nota visível').first()).toBeVisible()
  })
})
