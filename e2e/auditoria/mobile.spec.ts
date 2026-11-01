import { test, expect, gotoApp, apiCall, uid } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Jornadas principais em 390×844 (iPhone 12–15) com toque: navegação inferior, caderno, card,
 * revisão por toque, editar/excluir card no toque, configurações e sair. Sem scroll horizontal.
 */
test.use({ auditUser: 'mobile', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

const bottomNav = (page: Page) => page.locator('nav[aria-label="Navegação mobile"]')

async function noHorizontalOverflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `scroll horizontal em ${where}`).toBeLessThanOrEqual(1)
}

async function openTree(page: Page) {
  const novo = page.getByRole('button', { name: 'Novo', exact: true })
  if (!(await novo.isVisible())) await page.getByRole('button', { name: /Ver cadernos|Cadernos/i }).first().tap()
  await expect(novo).toBeVisible()
}

test.describe('Mobile 390px', () => {
  test('telas principais sem scroll horizontal e com navegação inferior', async ({ page }) => {
    for (const path of ['/hoje', '/cadernos', '/progresso', '/simulados', '/provas', '/podcasts', '/configuracoes', '/planos', '/importar']) {
      await gotoApp(page, path)
      await noHorizontalOverflow(page, path)
    }
    await gotoApp(page, '/hoje')
    await expect(bottomNav(page)).toBeVisible()
    for (const label of ['Hoje', 'Cadernos', 'Revisão']) await expect(bottomNav(page).getByRole('link', { name: label })).toBeVisible()
  })

  test('caderno → card → revisão inteira por toque', async ({ page }) => {
    test.setTimeout(60_000)
    const name = `Mobile ${uid()}`
    await gotoApp(page, '/cadernos')
    await openTree(page)
    await page.getByRole('button', { name: 'Novo', exact: true }).tap()
    await page.getByRole('button', { name: 'Novo caderno' }).first().tap()
    const dialog = page.getByRole('dialog', { name: 'Criar caderno' })
    await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill(name)
    const box = await dialog.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(390)
    await dialog.getByRole('button', { name: 'Criar' }).tap()
    await expect(dialog).toBeHidden()

    await openTree(page)
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().tap()
    await page.getByRole('tab', { name: /^Cards/ }).tap()
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().tap()
    const card = page.getByRole('dialog', { name: /flashcard/ })
    await card.locator('.ProseMirror').nth(0).tap()
    await page.keyboard.type('Capital do Peru?')
    await card.locator('.ProseMirror').nth(1).tap()
    await page.keyboard.type('Lima')
    const save = card.getByRole('button', { name: 'Salvar', exact: true })
    await save.scrollIntoViewIfNeeded()
    await save.tap()
    await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()
    await noHorizontalOverflow(page, '/cadernos (aba Cards)')

    await bottomNav(page).getByRole('link', { name: 'Revisão' }).tap()
    await page.waitForURL('**/revisar**')
    const face = page.locator('.review-card').first()
    await expect(face).toContainText('Capital do Peru?')
    const fb = await face.boundingBox()
    expect(fb!.x).toBeGreaterThanOrEqual(0)
    expect(fb!.x + fb!.width).toBeLessThanOrEqual(390)
    await face.tap()
    const easy = page.getByRole('button', { name: /^Fácil demais/ })
    await expect(easy).toBeInViewport()
    const eb = await easy.boundingBox()
    expect(eb!.height, 'alvo de toque ≥ 44px').toBeGreaterThanOrEqual(44)
    await easy.tap()
    await expect(face).toBeHidden({ timeout: 10_000 })
    await noHorizontalOverflow(page, '/revisar (fim)')
  })

  test('editar e excluir card estão visíveis no toque (sem hover)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Toque ${uid()}` })
    await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: t.data.id, cards: [{ front: 'Frente toque', back: 'Verso toque' }] })
    await gotoApp(page, `/cadernos?topic=${t.data.id}`)
    await page.getByRole('tab', { name: /^Cards/ }).tap()
    await expect(page.getByText('Frente toque')).toBeVisible()
    const edit = page.getByRole('button', { name: 'Editar card' }).first()
    const opacity = await edit.evaluate(el => {
      let o = 1
      for (let n: HTMLElement | null = el as HTMLElement; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return o
    })
    test.info().annotations.push({ type: 'evidência', description: `opacidade efetiva de "Editar card" no toque: ${opacity}` })
    // BUG: HubCardsTab.vue usa `opacity-0 group-hover:opacity-100` sem variante para toque/foco
    expect(opacity, 'botões Editar/Excluir invisíveis sem hover').toBeGreaterThan(0.5)
  })

  test('configurações pelo menu "Mais"', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await page.getByRole('button', { name: 'Mais' }).tap()
    const sheet = page.getByRole('dialog', { name: 'Mais opções' })
    await sheet.getByRole('link', { name: 'Configurações' }).tap()
    await page.waitForURL('**/configuracoes')
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
    await noHorizontalOverflow(page, '/configuracoes')
  })
})
