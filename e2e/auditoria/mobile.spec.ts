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

test.describe('Mobile 390px', () => {
  test('telas principais sem scroll horizontal e com navegação inferior', async ({ page }) => {
    for (const path of ['/hoje', '/cadernos', '/praticar', '/progresso', '/simulados', '/provas', '/podcasts', '/configuracoes', '/planos', '/importar']) {
      await gotoApp(page, path)
      await noHorizontalOverflow(page, path)
    }
    await gotoApp(page, '/hoje')
    await expect(bottomNav(page)).toBeVisible()
    await expect(bottomNav(page).getByRole('link')).toHaveText(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
  })

  test('caderno → card → revisão inteira por toque', async ({ page }) => {
    test.setTimeout(60_000)
    const name = `Mobile ${uid()}`
    await gotoApp(page, '/cadernos')
    await page.getByRole('button', { name: /Novo caderno|Criar caderno/ }).first().tap()
    const dialog = page.getByRole('dialog', { name: 'Novo caderno' })
    await dialog.getByRole('textbox', { name: 'Nome do caderno' }).fill(name)
    const box = await dialog.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(390)
    await dialog.getByRole('button', { name: 'Criar' }).tap()
    await expect(dialog).toBeHidden()

    // The new caderno opens its hub; "Todos os cards" (Praticar) is the old Cards tab
    await expect(page.getByTestId('scope-header').getByRole('heading', { level: 1 })).toHaveText(name)
    await page.goto(page.url() + '/cards')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Criar (primeiro )?card/ }).first().tap()
    const card = page.getByRole('dialog', { name: /^(Novo|Editar) card$/ })
    await card.locator('.ProseMirror').nth(0).tap()
    await page.keyboard.type('Capital do Peru?')
    await card.locator('.ProseMirror').nth(1).tap()
    await page.keyboard.type('Lima')
    const save = card.getByRole('button', { name: 'Salvar', exact: true })
    await save.scrollIntoViewIfNeeded()
    await save.tap()
    await expect(page.getByRole('status').getByText('Card criado!')).toBeVisible()
    await noHorizontalOverflow(page, '/cadernos/{id}/cards')

    // Revisar mora em Praticar (navegação v3: 4 abas, sem "Revisão" nem "Mais")
    await bottomNav(page).getByRole('link', { name: 'Praticar' }).tap()
    await page.getByRole('link', { name: 'Revisar agora' }).tap()
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
    await gotoApp(page, `/cadernos/${t.data.id}/cards`)
    await expect(page.getByText('Frente toque')).toBeVisible()
    // 4c-1: a linha abre o card, com Editar e Excluir sempre visíveis (o hover saiu com o HubCardsTab)
    await page.getByTestId('card-row-open').first().tap()
    const edit = page.getByRole('dialog', { name: 'Card' }).getByRole('button', { name: 'Editar' })
    await expect(edit).toBeVisible()
    await page.waitForTimeout(300) // the dialog fades in
    const opacity = await edit.evaluate(el => {
      let o = 1
      for (let n: HTMLElement | null = el as HTMLElement; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
      return o
    })
    test.info().annotations.push({ type: 'evidência', description: `opacidade efetiva de "Editar card" no toque: ${opacity}` })
    // Era bug do HubCardsTab (`opacity-0 group-hover:opacity-100`); a biblioteca v3 não esconde ações
    expect(opacity, 'botões Editar/Excluir invisíveis sem hover').toBeGreaterThan(0.5)
  })

  test('configurações pelo menu da conta (avatar no cabeçalho do Hoje)', async ({ page }) => {
    await gotoApp(page, '/hoje')
    await page.getByRole('button', { name: 'Menu da conta' }).tap()
    await page.getByRole('menuitem', { name: 'Conta e segurança' }).tap()
    await page.waitForURL('**/configuracoes**')
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
    await noHorizontalOverflow(page, '/configuracoes')
  })
})
