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

async function menuAction(page: Page, name: string, action: 'Editar' | 'Excluir' | 'Adicionar tópico') {
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

  // BUG: TreeItemMenu.vue declara `canAddChild?: boolean` — o cast booleano do Vue transforma a prop
  // ausente em false e o item "Adicionar tópico" nunca aparece (regressão do commit 5a68b0d).
  test('subtópico: "Adicionar tópico" cria filho dentro do caderno', async ({ page }) => {
    const parent = `Pai ${uid()}`
    await gotoApp(page, '/cadernos')
    await apiCall(page, 'POST', '/topics', { name: parent })
    await page.reload()
    await page.getByRole('button', { name: `Opções de ${parent}`, exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Adicionar tópico' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('menuitem', { name: 'Adicionar tópico' }).click()
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

  // Lacuna de produto, não de teste: o menu do tópico só tem Adicionar tópico/Editar/Excluir
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
