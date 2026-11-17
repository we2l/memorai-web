import { expect, test, type Page } from '@playwright/test'
import { json } from './helpers'

// prd-paginas-edital-publicas RF-W11: the conferred edital page with the test fixture (build with EDITAIS_FIXTURES=1;
// tests/fixtures/editais, never published). No API: the page is prerendered and the actions are only observed.
// EDITAIS_SHOTS=dir also saves the page and the index at 390 and 1440 px, light and dark (visual check of the PR).
const SLUG = 'tex-2026-analista-de-teste'
const PATH = `/editais/${SLUG}`
const SHOTS = process.env.EDITAIS_SHOTS

async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page.locator('main a[href^="/"]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).getAttribute('href')!))
  return [...new Set(hrefs.map(h => h.split('?')[0]!.split('#')[0]!))]
}

test.describe('páginas de edital conferido', () => {
  test('o HTML traz a lista inteira aberta, o estado, a fonte e cada link interno leva a uma rota que existe', async ({ page, request }) => {
    await page.goto(PATH)
    await expect(page.getByTestId('edital-page-title')).toHaveText('Edital verticalizado TEX 2026: Analista de Teste')
    await expect(page.getByTestId('edital-page-status-label')).toHaveText('Inscrições abertas até 10/01')
    await expect(page.getByTestId('edital-page-trust').locator('a')).toHaveAttribute('rel', 'noopener nofollow')
    await expect(page.getByTestId('edital-topic-4-1')).toBeVisible()
    // The list is navigable by keyboard: each assunto is a labelled checkbox
    await page.getByTestId('edital-topic-0-0').check()
    await expect(page.getByTestId('edital-result-progress')).toContainText('1 de 14')
    for (const href of await internalLinks(page)) {
      const res = await request.get(href)
      expect(res.status(), href).toBeLessThan(400)
    }
  })

  test('"Estudar isso no Baigi" sem conta grava a intenção e vai ao cadastro com a UTM da página', async ({ page }) => {
    await page.goto(PATH)
    await page.getByTestId('edital-apply').click()
    await expect(page).toHaveURL(new RegExp(`/criar-conta\\?utm_source=editais&utm_medium=organic&utm_content=${SLUG}-actions`))
    expect(await page.evaluate(() => localStorage.getItem('baigi-edital-intent'))).toBe('01JDTESTF1XTVRE0000000000A')
  })

  test('com conta, chama o apply da leitura (só observado, nunca respondido pelo teste)', async ({ page, context }) => {
    await context.addCookies([{ name: 'baigi_logged_in', value: '1', url: page.url() === 'about:blank' ? 'http://localhost' : page.url() }])
    // Only the session is mocked (who is logged in); the persistence route is left alone (CLAUDE.md, E2E)
    await page.route('**/api/me', r => r.fulfill(json({ data: { id: 1, name: 'E2E', email: 'e2e-editais@audit.test', email_verified_at: '2026-11-01T00:00:00Z', onboarding_completed: true, plan: 'free' } })))
    await page.route('**/sanctum/csrf-cookie', r => r.fulfill({ status: 204 }))
    await page.goto(PATH)
    const applied = page.waitForRequest(req => req.method() === 'POST' && req.url().includes('/editais/publicos/01JDTESTF1XTVRE0000000000A/apply'))
    await page.getByTestId('edital-apply').click()
    await applied
  })

  test('a barra fixa aparece em 390 px depois da Situação e some com as ações na tela', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PATH)
    const sticky = page.getByTestId('edital-page-sticky')
    await expect(sticky).toHaveCount(0)
    await page.getByTestId('edital-page-weights').scrollIntoViewIfNeeded()
    await expect(sticky).toBeVisible()
    await page.getByTestId('edital-actions').scrollIntoViewIfNeeded()
    await expect(sticky).toHaveCount(0)
  })

  test('no dia seguinte à prova (antes do rebuild) a página mostra um estado só: a prova foi', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2099-03-15T12:00:00-03:00'))
    await page.goto(PATH)
    await expect(page.getByTestId('edital-page-status-label')).toHaveText('A prova foi em 14/03/2099')
    await expect(page.getByTestId('edital-page-title')).toHaveText('Último edital do TEX (2026): base para estudar antes do próximo')
    await expect(page.getByText(/Inscrições abertas/)).toHaveCount(0)
    await expect(page.getByTestId('edital-see-editais')).toHaveAttribute('href', '/editais')
    await expect(page.getByTestId('edital-expired-line')).toBeVisible()
    await expect(page.getByTestId('edital-page-sticky')).toHaveCount(0)
  })

  test('o índice lista o edital aberto e o cartão da ferramenta', async ({ page }) => {
    await page.goto('/editais')
    await expect(page.getByTestId('editais-row')).toHaveCount(1)
    await expect(page.getByTestId('editais-row')).toContainText('TEX 2026 · Analista de Teste')
    await expect(page.getByTestId('editais-tool')).toHaveAttribute('href', '/ferramentas/edital-verticalizado')
  })

  test('telas para conferência visual (390 e 1440, claro e escuro)', async ({ page }) => {
    test.skip(!SHOTS, 'só com EDITAIS_SHOTS=dir')
    for (const theme of ['light', 'dark']) {
      await page.addInitScript(t => localStorage.setItem('color-mode', t), theme)
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
        for (const [name, path] of [['pagina', PATH], ['indice', '/editais']]) {
          await page.goto(path)
          await page.waitForLoadState('networkidle')
          await page.screenshot({ path: `${SHOTS}/${name}-${width}-${theme}.png`, fullPage: true })
        }
      }
    }
  })
})
