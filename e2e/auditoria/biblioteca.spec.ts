import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall } from './support/fixtures'
import { ensureLibrarySeed, type LibrarySeed } from './support/seed-material'

/**
 * Biblioteca de cards v3 (prd-4c-material-v3 §10.1, tasks 11.2): filters on the server and in the URL,
 * search, cursor pages ("Carregar mais"), selection that reviews (≤ 100) or deletes, the empty filter and
 * a light DOM with 300 cards. Own user (e2e-library@audit.test) with 320 cards in several states.
 */
test.use({ auditUser: 'library' })

let seed: LibrarySeed
const url = () => `/cadernos/${seed.rootId}/cards`
const rows = (page: Page) => page.getByTestId('card-row')

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  seed = await ensureLibrarySeed(page)
})

async function loadAll(page: Page, until = Infinity) {
  const more = page.getByTestId('card-more')
  while (await more.count() && (await rows(page).count()) < until) {
    const n = await rows(page).count()
    await more.click()
    await expect.poll(() => rows(page).count()).toBeGreaterThan(n)
  }
}

test('filtros vão para a URL, voltam com ela e o servidor filtra (estado + só erros + ordem)', async ({ page }) => {
  await gotoApp(page, url())
  await expect(page.getByTestId('library-count')).toContainText(`${seed.total} cards`)
  const filtered = page.waitForResponse(r => r.url().includes('/flashcards?') && r.url().includes('state=due'))
  await page.getByTestId('card-state-due').click()
  await filtered
  await page.getByTestId('card-errors').check()
  await page.getByTestId('card-sort').selectOption('lapses')
  await expect(page).toHaveURL(/state=due/)
  await expect(page).toHaveURL(/errors=1/)
  await expect(page).toHaveURL(/sort=lapses/)
  await expect(page.getByTestId('library-count')).toContainText('40 cards com esses filtros')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('card-state-due')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('library-count')).toContainText('40 cards com esses filtros')
  for (const text of await rows(page).allTextContents()) expect(text).toContain('atrasado')
  await page.getByTestId('card-clear').click()
  await expect(page.getByTestId('library-count')).toContainText(`${seed.total} cards`)
})

test('busca no servidor (≥ 2 letras) e origem por material', async ({ page }) => {
  await gotoApp(page, url())
  const search = page.waitForResponse(r => r.url().includes('/flashcards?') && r.url().includes('q=mandado'))
  await page.getByTestId('card-search').fill('mandado')
  await search
  await expect(page.getByTestId('library-count')).toContainText('20 cards com esses filtros')
  for (const text of await rows(page).allTextContents()) expect(text.toLowerCase()).toContain('mandado')
  await page.getByTestId('card-search').fill('')
  await gotoApp(page, `${url()}?origin=note:${seed.noteId}`)
  await expect(page.getByTestId('library-count')).toContainText('20 cards')
  await expect(rows(page).first()).toContainText('Resumo B')
})

test('"Carregar mais" de 50 em 50 até o fim: todos os cards, sem repetir, foco na 1ª linha nova', async ({ page }) => {
  await gotoApp(page, url())
  await expect(rows(page)).toHaveCount(50)
  await page.getByTestId('card-more').click()
  await expect(rows(page)).toHaveCount(100)
  await expect(rows(page).nth(50).getByTestId('card-row-open')).toBeFocused()
  await loadAll(page)
  await expect(page.getByTestId('card-more')).toHaveCount(0)
  const fronts = await rows(page).getByTestId('card-row-open').evaluateAll(els => els.map(e => e.querySelector('span')!.textContent))
  expect(fronts.length).toBe(seed.total)
  expect(new Set(fronts).size).toBe(seed.total)
})

test('seleção → Revisar abre a sessão desses cards; acima de 100 fica desabilitado com o motivo', async ({ page }) => {
  await gotoApp(page, url())
  const boxes = rows(page).getByRole('checkbox')
  await boxes.nth(0).click()
  await boxes.nth(3).click({ modifiers: ['Shift'] })
  const bar = page.getByTestId('card-selection')
  await expect(bar).toContainText('4 selecionados')
  // Space on a focused row marks it too
  await rows(page).nth(6).getByTestId('card-row-open').focus()
  await page.keyboard.press('Space')
  await expect(bar).toContainText('5 selecionados')
  const review = bar.getByTestId('card-selection-review')
  const href = await review.getAttribute('href')
  expect(href).toMatch(/^\/revisar\?scope=cards&card_ids=/)
  expect(href!.split('card_ids=')[1]!.split(',')).toHaveLength(5)

  await loadAll(page, 150)
  await bar.getByRole('button', { name: 'Selecionar todos desta página' }).click()
  await expect(bar).toContainText('150 selecionados')
  await expect(review).toBeDisabled()
  await expect(bar).toContainText('Revise até 100 de uma vez')
})

test('vazio do filtro: "Nenhum card com esses filtros" e "Limpar filtros"', async ({ page }) => {
  await gotoApp(page, `${url()}?q=zzz-nada-assim`)
  await expect(page.getByTestId('library-empty-filter')).toContainText('Nenhum card com esses filtros')
  await page.getByTestId('library-empty-filter').getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(rows(page)).toHaveCount(50)
})

test('DOM leve: 300 cards carregados ficam abaixo de 3.600 elementos', async ({ page }) => {
  await gotoApp(page, url())
  await loadAll(page, 300)
  expect(await rows(page).count()).toBeGreaterThanOrEqual(300)
  const dom = await page.evaluate(() => document.getElementsByTagName('*').length)
  test.info().annotations.push({ type: 'evidência', description: `${await rows(page).count()} linhas, ${dom} elementos` })
  expect(dom).toBeLessThanOrEqual(3600)
})

test('seleção → Excluir: confirma com o número e apaga de verdade', async ({ page }) => {
  await gotoApp(page, `${url()}?origin=note:${seed.noteId}`)
  await expect(page.getByTestId('library-count')).toContainText('20 cards')
  const boxes = rows(page).getByRole('checkbox')
  await boxes.nth(0).click()
  await boxes.nth(1).click()
  await page.getByTestId('card-selection-delete').click()
  const confirm = page.getByRole('alertdialog')
  await expect(confirm).toContainText('Excluir 2 cards?')
  const del = page.waitForResponse(r => r.url().endsWith('/api/flashcards/delete'))
  await confirm.getByRole('button', { name: 'Excluir 2' }).click()
  expect((await (await del).json()).deleted).toBe(2)
  await expect(page.getByTestId('library-count')).toContainText('18 cards')
  const left = (await apiCall(page, 'GET', `/topics/${seed.rootId}/flashcards?origin=note:${seed.noteId}&limit=50`)).meta.total
  expect(left).toBe(18)
})

test.describe('Acessibilidade da biblioteca (axe)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1440, 390]) {
      test(`${width}px ${theme}: lista, filtros, seleção e card aberto sem violações serious/critical`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        await page.setViewportSize({ width, height: 900 })
        const check = async (what: string) => {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
          expect(bad.map(v => `${what}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
        }
        await gotoApp(page, `${url()}?state=due,learning`)
        await check('filtros')
        await rows(page).getByRole('checkbox').first().click()
        await check('seleção')
        await rows(page).nth(1).getByTestId('card-row-open').click()
        await expect(page.getByRole('dialog', { name: 'Card' })).toBeVisible()
        await page.waitForTimeout(400) // the dialog fades in: contrast is read after it
        await check('card')
      })
    }
  }
})
