import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall } from './support/fixtures'
import { ensureMaterialSeed, PDF_TEXT, type MaterialSeed } from './support/seed-material'

/**
 * Material v3 (prd-4c-material-v3 §10.1, tasks 11.1): the material route with the reader, the outline,
 * "Cards desta parte", the actions on a selection and "Ver no PDF". Own user (e2e-material@audit.test).
 * The AI is answered at the job (`GET /ai/jobs/{id}`), never at `accept-cards`: the accept is real and
 * records the origin. The PDF is a local fixture (24 pages) behind a mocked signed URL.
 */
test.use({ auditUser: 'material' })

const PDF_FILE = path.join(__dirname, 'fixtures', 'apostila-24p.pdf')
const WORKER = path.join(__dirname, '..', '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const AI_CARDS = [
  { front: 'O que é controle de constitucionalidade?', back: 'A verificação da compatibilidade das leis com a Constituição.' },
  { front: 'O controle pressupõe o quê?', back: 'Supremacia formal e rigidez constitucional.' },
  { front: 'Quem faz o controle de constitucionalidade?', back: 'O Judiciário, o Legislativo e o Executivo, cada um a seu modo.' },
]

let seed: MaterialSeed
const pdfUrl = () => `/cadernos/${seed.subjectId}/material/${seed.pdfNoteId}`
const manualUrl = () => `/cadernos/${seed.subjectId}/material/${seed.manualNoteId}`
const reader = (page: Page) => page.getByTestId('material-reader')
const panel = (page: Page) => page.getByTestId('material-cards-panel')

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/hoje')
  seed = await ensureMaterialSeed(page)
  // A clean device once per test (a reload inside the test keeps what the test chose)
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('e2e-clean')) return
      sessionStorage.setItem('e2e-clean', '1')
      for (const k of Object.keys(localStorage)) if (k.startsWith('baigi-material-mode-')) localStorage.removeItem(k)
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('baigi-card-workshop')) sessionStorage.removeItem(k)
    } catch {}
  })
})

/** The AI job: POST answers 202 pending; the poll answers the cards (mock at the job, not at the accept). */
async function mockAiJob(page: Page, cards = AI_CARDS) {
  const posts: any[] = []
  await page.route(/\/api\/ai\/generate-cards$/, async (route) => {
    posts.push(route.request().postDataJSON())
    await route.fulfill({ status: 202, json: { data: { id: 'job-material', type: 'cards', status: 'pending', created_at: '' } } })
  })
  await page.route(/\/api\/ai\/jobs\/job-material$/, route => route.fulfill({ json: { data: { id: 'job-material', type: 'cards', status: 'done', result: { cards }, created_at: '' } } }))
  return posts
}

async function mockPdf(page: Page) {
  await page.route(/\/api\/documents\/[^/]+\/file-url$/, r => r.fulfill({ json: { data: { url: 'http://localhost:3000/__e2e/apostila.pdf' } } }))
  await page.route('**/__e2e/apostila.pdf', r => r.fulfill({ path: PDF_FILE, contentType: 'application/pdf' }))
  await page.route('**/pdf.worker.min.mjs', r => r.fulfill({ path: WORKER, contentType: 'text/javascript' }))
}

/** Selects the text of the paragraph that contains `text`, inside the reader. */
async function selectText(page: Page, text: string) {
  await page.evaluate((t) => {
    const p = [...document.querySelectorAll('[data-testid=material-text] .ProseMirror p')].find(el => el.textContent?.includes(t))!
    const node = [...p.childNodes].find(n => n.textContent?.includes(t))!
    const target = node.nodeType === 3 ? node : node.firstChild!
    const range = document.createRange()
    const start = target.textContent!.indexOf(t)
    range.setStart(target, start)
    range.setEnd(target, start + t.length)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  }, text)
  await expect(page.getByTestId('selection-actions')).toBeVisible()
}

const noteCards = async (page: Page) => ((await apiCall(page, 'GET', `/topics/${seed.rootId}/flashcards?origin=note:${seed.pdfNoteId}&limit=100`)).data as any[])

test('PDF abre em leitura; "Editar" e a tecla E trocam o modo, e a escolha fica salva por nota', async ({ page }) => {
  await gotoApp(page, pdfUrl())
  await expect(reader(page)).toHaveAttribute('data-mode', 'read')
  await expect(reader(page).locator('.ProseMirror')).toHaveAttribute('contenteditable', 'false')
  await expect(page.getByTestId('material-source')).toContainText('Da apostila Apostila M')
  await page.getByTestId('material-mode').click()
  await expect(reader(page)).toHaveAttribute('data-mode', 'edit')
  await expect(reader(page).locator('.ProseMirror')).toHaveAttribute('contenteditable', 'true')
  await expect(page.getByTestId('material-title-input')).toHaveText('Apostila M (resumo)')
  await page.keyboard.press('e')
  await expect(reader(page)).toHaveAttribute('data-mode', 'read')
  await page.keyboard.press('e')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(reader(page)).toHaveAttribute('data-mode', 'edit')
})

test('nota manual abre em edição', async ({ page }) => {
  await gotoApp(page, manualUrl())
  await expect(reader(page)).toHaveAttribute('data-mode', 'edit')
  await expect(page.getByTestId('material-mode')).toHaveText(/Concluir edição/)
  await expect(page.getByTestId('material-source')).toHaveCount(0)
})

test('sumário: os títulos da nota, o clique rola até o título e põe o foco nele', async ({ page }) => {
  await gotoApp(page, pdfUrl())
  const outline = page.getByRole('navigation', { name: 'Partes do material' })
  await expect(outline.getByRole('link', { name: /Apostila M \(resumo\)/ })).toHaveAttribute('aria-current', 'page')
  await expect(outline.getByTestId('outline-heading')).toHaveText(['1. Conceito', '2. Espécies quanto ao momento', '2.1 Controle difuso'])
  await outline.getByTestId('outline-heading').nth(2).click()
  const target = reader(page).locator('.ProseMirror h3', { hasText: '2.1 Controle difuso' })
  await expect(target).toBeFocused()
  await expect(target).toBeInViewport()
  await expect(outline.getByTestId('outline-heading').nth(2)).toHaveAttribute('aria-current', 'location')
})

test('painel: os cards da nota com o estado e "Revisar estes N" = a sessão que abre', async ({ page }) => {
  await gotoApp(page, pdfUrl())
  await expect(panel(page).getByRole('heading', { name: 'Cards desta parte (3)' })).toBeVisible()
  await expect(panel(page).getByTestId('panel-card')).toHaveCount(3)
  await expect(panel(page).getByTestId('panel-card').first()).toContainText('novo')
  const review = panel(page).getByTestId('panel-review')
  const n = Number((await review.innerText()).match(/estes (\d+)/)?.[1])
  const material = (await apiCall(page, 'GET', `/notes/${seed.pdfNoteId}/material`)).data
  expect(n).toBe(material.cards.session_count)
  await expect(panel(page).getByTestId('panel-library')).toHaveAttribute('href', `/cadernos/${seed.subjectId}/cards?origin=note:${seed.pdfNoteId}`)
  const session = page.waitForResponse(r => r.url().includes('/api/review/session?'))
  await review.click()
  await expect(page).toHaveURL(new RegExp(`/revisar\\?scope=note:${seed.pdfNoteId}`))
  expect((await (await session).json()).session_count).toBe(n)
})

test('"Gerar com IA" abre a oficina no painel com o leitor na tela; o aceite grava a origem', async ({ page }) => {
  const posts = await mockAiJob(page)
  const before = (await noteCards(page)).length
  await gotoApp(page, pdfUrl())
  await panel(page).getByRole('button', { name: /Gerar mais cards com IA/ }).click()
  await expect(panel(page).getByTestId('workshop-card')).toHaveCount(3)
  await expect(reader(page)).toBeInViewport()
  expect(posts[0]).toMatchObject({ source: 'notes', note_id: seed.pdfNoteId })
  const accept = page.waitForResponse(r => r.url().endsWith('/api/ai/accept-cards') && r.request().method() === 'POST')
  await panel(page).getByTestId('workshop-card').first().getByRole('button', { name: 'Aceitar' }).click()
  expect((await accept).status()).toBeLessThan(300)
  await panel(page).getByRole('button', { name: 'Descartar tudo' }).click()
  await expect(panel(page).getByRole('heading', { name: `Cards desta parte (${before + 1})` })).toBeVisible()
  expect((await noteCards(page)).some(c => c.front === AI_CARDS[0]!.front)).toBe(true)
})

test('seleção → "Criar card": o card nasce com a origem da nota', async ({ page }) => {
  const before = (await noteCards(page)).length
  await gotoApp(page, pdfUrl())
  await selectText(page, PDF_TEXT)
  await page.getByTestId('selection-actions').getByRole('button', { name: 'Criar card' }).click()
  const dialog = page.getByRole('dialog', { name: 'Criar card' })
  await expect(dialog.getByRole('textbox', { name: 'Frente' })).toHaveValue(PDF_TEXT)
  await dialog.getByRole('textbox', { name: 'Verso' }).fill('Compatibilidade com a Constituição.')
  await dialog.getByRole('button', { name: 'Criar card' }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(async () => (await noteCards(page)).length).toBe(before + 1)
  await expect(panel(page).getByRole('heading', { name: `Cards desta parte (${before + 1})` })).toBeVisible()
})

test('seleção → "Gerar 3 cards com IA": manda o trecho e os 3 cards entram com a origem', async ({ page }) => {
  const posts = await mockAiJob(page)
  const before = (await noteCards(page)).length
  await gotoApp(page, pdfUrl())
  await selectText(page, PDF_TEXT)
  await page.getByTestId('selection-actions').getByRole('button', { name: 'Gerar 3 cards com IA' }).click()
  await expect(panel(page).getByTestId('workshop-card')).toHaveCount(3)
  expect(posts[0]).toMatchObject({ source: 'selection', note_id: seed.pdfNoteId, text: PDF_TEXT })
  await panel(page).getByRole('button', { name: 'Salvar 3 cards' }).click()
  await expect(panel(page).getByText('Tudo pronto!')).toBeVisible()
  await expect.poll(async () => (await noteCards(page)).length).toBe(before + 3)
})

test('"(pág. 12)" no texto e "Ver no PDF" abrem o PDF na página, desenhando no máximo 3', async ({ page }) => {
  await mockPdf(page)
  await gotoApp(page, pdfUrl())
  const link = reader(page).locator('[data-page="12"]')
  await expect(link).toHaveAttribute('role', 'link')
  await link.click()
  const dialog = page.getByRole('dialog', { name: /Apostila M\.pdf/ })
  await expect(dialog).toContainText('24 páginas · página 12')
  await expect(dialog.locator('[data-page="12"][data-drawn="1"]')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(500)
  expect(await dialog.locator('[data-drawn="1"]').count()).toBeLessThanOrEqual(3)
  await page.keyboard.press('Escape')
  await page.getByTestId('material-open-pdf').click()
  await expect(dialog).toContainText('página 1')
})

test('?from=review: "‹ Voltar à revisão" leva de volta à sessão', async ({ page }) => {
  const back = `/revisar?scope=note:${seed.pdfNoteId}`
  await gotoApp(page, `${pdfUrl()}?from=review&back=${encodeURIComponent(back)}`)
  const link = page.getByTestId('material-back')
  await expect(link).toHaveAccessibleName('Voltar à revisão')
  await expect(link).toHaveAttribute('href', back)
  // Nothing outside the review session is accepted as the way back
  await gotoApp(page, `${pdfUrl()}?from=review&back=${encodeURIComponent('https://example.com')}`)
  await expect(page.getByTestId('material-back')).toHaveAttribute('href', '/revisar')
})

test('celular: só o leitor, "Sumário" e "Cards (N)" em folhas e o primário na barra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoApp(page, pdfUrl())
  await expect(panel(page)).toHaveCount(0)
  const bar = page.getByTestId('material-bar')
  await expect(bar.getByRole('link', { name: /^Revisar \d+$/ })).toBeVisible()
  await bar.getByRole('button', { name: 'Sumário' }).click()
  const outline = page.getByRole('dialog', { name: 'Sumário' })
  await outline.getByTestId('outline-heading').nth(1).click()
  await expect(outline).toBeHidden()
  await expect(reader(page).locator('.ProseMirror h2', { hasText: '2. Espécies' })).toBeInViewport()
  await bar.getByTestId('material-bar-cards').click()
  const sheet = page.getByRole('dialog', { name: 'Cards desta parte' })
  await expect(sheet.getByTestId('panel-card').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
})

test.describe('Acessibilidade do material (axe, dados reais)', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [1440, 390]) {
      test(`${width}px ${theme}: leitura, edição, oficina e PDF sem violações serious/critical`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        await page.setViewportSize({ width, height: 900 })
        await mockAiJob(page)
        await mockPdf(page)
        const check = async (what: string) => {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
          const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
          expect(bad.map(v => `${what}: ${v.id} ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
        }
        await gotoApp(page, pdfUrl())
        await check('leitura')
        await page.getByTestId('material-mode').click()
        await check('edição')
        if (width === 390) await page.getByTestId('material-bar-cards').click()
        await page.getByRole('button', { name: /Gerar mais cards com IA/ }).last().click()
        await expect(page.getByTestId('workshop-card').first()).toBeVisible()
        await check('oficina')
        await page.getByRole('button', { name: 'Descartar tudo' }).last().click()
        if (width === 390) await page.keyboard.press('Escape')
        await page.getByTestId('material-open-pdf').click()
        await expect(page.locator('[data-drawn="1"]').first()).toBeVisible({ timeout: 15_000 })
        await check('pdf')
      })
    }
  }
})
