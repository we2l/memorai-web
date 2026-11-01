import { test, expect, gotoApp, apiCall, uid, doc } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Nota: criar, editar (título + corpo), salvar (autosave 1 s) e perder conexão no meio.
 */
test.use({ auditUser: 'pro' })

const editor = (page: Page) => page.locator('.ProseMirror').first()
const title = (page: Page) => page.locator('.notion-title')
const saveIndicator = (page: Page) => page.getByRole('main').getByText(/^(Salvando\.\.\.|✓)$/)

async function openNote(page: Page, topicId: string, noteTitle: string) {
  await gotoApp(page, `/cadernos?topic=${topicId}`)
  await page.locator('.note-card').filter({ hasText: noteTitle }).click()
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
    await gotoApp(page, `/cadernos?topic=${topicId}`)

    const created = page.waitForResponse(r => r.request().method() === 'POST' && /\/topics\/[^/]+\/notes$/.test(r.url()))
    await page.getByRole('button', { name: /Escrever uma nota/ }).click()
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
    await expect(saveIndicator(page)).toHaveText('✓')

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
    await page.getByRole('button', { name: 'Excluir nota' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('heading', { name: 'Excluir nota?' })).toBeVisible()
    await confirm.getByRole('button', { name: 'Cancelar' }).click()
    expect((await noteText(page, n.data.id)).title).toBe('Nota para excluir')

    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('button', { name: 'Excluir nota' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByRole('status').getByText('Nota excluída.')).toBeVisible()
    const res = await page.context().request.get(`http://localhost:8037/api/notes/${n.data.id}`, { headers: { Accept: 'application/json', Origin: 'http://localhost:3000', Referer: 'http://localhost:3000/' } })
    expect(res.status()).toBe(404)
  })
})

test.describe('Nota — navegação e acessibilidade', () => {
  test('recarregar com ?note= na URL reabre a nota que estava aberta', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota do link', content: doc('corpo do link') })
    await openNote(page, topicId, 'Nota do link')
    await expect(page).toHaveURL(/[?&]note=/)
    await page.reload()
    await page.waitForLoadState('networkidle')
    // BUG: onMounted (pages/cadernos/index.vue) chama selectNote, não openNoteEditor — a URL mantém
    // ?note= mas a tela volta para a lista.
    await expect(editor(page)).toContainText('corpo do link')
  })

  test('nota da lista abre pelo teclado (Tab + Enter)', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota teclado', content: doc('abre com Enter') })
    await gotoApp(page, `/cadernos?topic=${topicId}`)
    const card = page.locator('.note-card').filter({ hasText: 'Nota teclado' })
    await expect(card).toBeVisible()
    // BUG (a11y): o card é um <div @click> sem role/tabindex/keydown (HubNotesTab.vue)
    await expect(card).toHaveAttribute('tabindex', '0', { timeout: 1000 })
    await card.focus()
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

    // Servidor não recebeu o texto
    expect((await noteText(page, n.data.id)).text).not.toContain('sem rede')
    // Esperado: aviso de erro / "não salvo" com como tentar de novo. BUG: o indicador volta para "✓"
    // e nenhum aviso aparece (useNoteEditor.debouncedSave não trata a rejeição de noteStore.update).
    await expect(saveIndicator(page)).not.toHaveText('✓', { timeout: 3000 })
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

  test('erro 500 ao abrir o material do caderno mostra erro com "Tentar de novo"', async ({ page }) => {
    const topicId = await newTopic(page)
    await apiCall(page, 'POST', `/topics/${topicId}/notes`, { title: 'Nota visível', content: doc('x') })
    let fail = true
    await page.route(`**/api/topics/${topicId}/notes`, route => fail && route.request().method() === 'GET'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.fallback())
    await gotoApp(page, `/cadernos?topic=${topicId}`)
    const error = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o material' })
    await expect(error).toBeVisible()
    fail = false
    await error.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText('Nota visível').first()).toBeVisible()
  })
})
