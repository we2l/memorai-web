import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, sql } from './support/fixtures'
import { ensurePartsSeed, setRowDocument, type PartsSeed } from './support/seed-material'

/**
 * Material em partes (prd-4c-material-v3 §10.2): cada parte do PDF é uma nota. Sumário com páginas, cards e domínio,
 * navegação [ ] entre as partes, "Ver no PDF (p. X)", regerar sem apagar, "Continuar" do Hoje na parte certa e a
 * linha do material contando os cards automáticos e o motivo do bloqueio. A geração é mockada; o resto é a API real.
 */
test.use({ auditUser: 'parts' })

const PDF_FILE = path.join(__dirname, 'fixtures', 'apostila-24p.pdf')
const WORKER = path.join(__dirname, '..', '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')

let seed: PartsSeed
test.beforeEach(async ({ page }) => {
  seed = await ensurePartsSeed(page)
  await page.setViewportSize({ width: 1440, height: 900 })
})

const partUrl = (i: number) => `/cadernos/${seed.rootId}/material/${seed.noteIds[i]}`
const title = (page: Page) => page.getByRole('heading', { level: 1 })

test('sumário com as partes reais; a aberta marcada e "parte 2 de 3" no caminho', async ({ page }) => {
  await gotoApp(page, partUrl(1))
  await expect(title(page)).toHaveText('Direitos e garantias')
  const outline = page.getByTestId('material-outline')
  await expect(outline).toContainText('Partes (24 p.)')
  const rows = outline.getByTestId('outline-part')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('1 · Princípios fundamentais')
  await expect(rows.nth(0)).toContainText(/p\. 1–8 · 3 cards/)
  await expect(rows.nth(1)).toContainText(/p\. 9–16 · 2 cards/)
  await expect(rows.nth(2)).toContainText('p. 17–24 · sem cards ainda')
  await expect(rows.nth(1)).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Caminho' })).toContainText('parte 2 de 3')
  // "Cards desta parte" é só desta nota
  const panel = page.getByTestId('material-cards-panel')
  await expect(panel).toContainText('Cards desta parte (2)')
  await expect(panel.getByTestId('panel-card')).toHaveCount(2)
})

test('navegação: links no fim do leitor e [ ], com "opened" gravado; o "Continuar" do Hoje abre a última parte', async ({ page }) => {
  // "opened" grava 1x a cada 10 min por nota: cada execução começa do zero
  const opened = () => sql(`select id from notes where source_document_id='${seed.docId}' order by last_opened_at desc nulls last limit 1`)
  sql(`update notes set last_opened_at=null where source_document_id='${seed.docId}'`)
  await gotoApp(page, partUrl(1))
  const nav = page.getByTestId('part-nav')
  await expect(nav.getByTestId('part-previous')).toContainText('Parte 1')
  await expect(nav.getByTestId('part-previous')).toContainText('Princípios fundamentais')
  await expect(nav.getByTestId('part-next')).toContainText('Parte 3')

  await page.waitForTimeout(1100) // last_opened_at guarda segundos: esta abertura tem de vir depois da anterior
  await page.keyboard.press(']')
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[2]}$`))
  await expect(title(page)).toHaveText('Remédios constitucionais')
  await expect(page.getByTestId('part-next')).toHaveCount(0)
  await expect.poll(opened).toBe(seed.noteIds[2])
  await page.keyboard.press(']') // na última: fica
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[2]}$`))

  await page.keyboard.press('[')
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[1]}$`))
  await page.waitForTimeout(1100) // last_opened_at guarda segundos: esta abertura tem de vir depois das outras
  await page.getByTestId('part-previous').click()
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[0]}$`))
  await expect(title(page)).toHaveText('Princípios fundamentais')
  await expect(page.getByTestId('part-previous')).toHaveCount(0)

  // Editando, [ e ] são texto: não trocam de parte
  await page.getByTestId('material-mode').click()
  await page.locator('.ProseMirror').first().click()
  await page.keyboard.press(']')
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[0]}$`))
  await page.keyboard.press('Backspace')
  await expect(page.getByTestId('material-save-state')).toHaveText('Salvo')
  await page.getByTestId('material-mode').click()

  // A última parte aberta pela 1ª vez é a 1: é ela que o "Continuar" do Hoje abre
  await expect.poll(opened).toBe(seed.noteIds[0])
  await gotoApp(page, '/hoje')
  await page.getByTestId('plan-step-material').getByRole('link').click()
  await expect(page).toHaveURL(new RegExp(`${seed.noteIds[0]}$`))
})

test('"Ver no PDF (p. 9)" abre o PDF no início da parte', async ({ page }) => {
  await page.route(/\/api\/documents\/[^/]+\/file-url$/, r => r.fulfill({ json: { data: { url: 'http://localhost:3000/__e2e/apostila.pdf' } } }))
  await page.route('**/__e2e/apostila.pdf', r => r.fulfill({ path: PDF_FILE, contentType: 'application/pdf' }))
  await page.route('**/pdf.worker.min.mjs', r => r.fulfill({ path: WORKER, contentType: 'text/javascript' }))
  await gotoApp(page, partUrl(1))
  await expect(page.getByTestId('material-source')).toContainText('p. 9–16')
  const open = page.getByTestId('material-open-pdf')
  await expect(open).toHaveText('Ver no PDF (p. 9)')
  await open.click()
  await expect(page.getByRole('dialog', { name: /Apostila P\.pdf/ })).toContainText('página 9')
})

test('regerar avisa que nada se apaga, chama a API e os cards continuam no painel', async ({ page }) => {
  const posts: string[] = []
  // Mock só na geração: o guard de IA corta esta rota de qualquer modo
  await page.route(/\/api\/documents\/[^/]+\/regenerate-note$/, (r) => {
    posts.push(new URL(r.request().url()).pathname)
    return r.fulfill({ status: 202, json: { data: { id: seed.docId } } })
  })
  await gotoApp(page, partUrl(0))
  await page.getByRole('button', { name: 'Mais opções do material' }).click()
  await page.getByRole('menuitem', { name: /Gerar as partes de novo/ }).click()
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog')).first()
  await expect(dialog).toContainText('Nada se apaga')
  await expect(dialog).toContainText('(antiga)')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  expect(posts).toEqual([])

  await page.getByRole('button', { name: 'Mais opções do material' }).click()
  await page.getByRole('menuitem', { name: /Gerar as partes de novo/ }).click()
  await dialog.getByRole('button', { name: 'Gerar de novo' }).click()
  await expect(page.getByText('Lendo o PDF de novo. Nada foi apagado.')).toBeVisible()
  expect(posts).toEqual([`/api/documents/${seed.docId}/regenerate-note`])
  await expect(page.getByTestId('material-cards-panel')).toContainText('Cards desta parte (3)')
})

test('escrevendo: o progresso é por parte, na tela do material e na linha do hub', async ({ page }) => {
  await page.route(new RegExp(`/api/documents/${seed.docId}$`), async (r) => {
    const res = await r.fetch()
    const json = await res.json()
    json.data.note_generation_status = 'generating'
    json.data.note_generation_progress = 4
    json.data.note_total_batches = 9
    await r.fulfill({ response: res, json })
  })
  await gotoApp(page, partUrl(1))
  await expect(page.getByRole('status').filter({ hasText: 'Escrevendo a parte 2 de 3 · lote 5 de 9' })).toBeVisible()

  setRowDocument(seed.rowDocId, { note_generation_status: 'generating', note_generation_progress: 3, note_total_batches: 12 })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  const row = page.getByTestId('material-row').filter({ hasText: 'Outro PDF' })
  await expect(row).toContainText('Escrevendo a parte 2 de 4 · lote 4 de 12')
  setRowDocument(seed.rowDocId, { note_generation_status: 'completed', note_generation_progress: 12 })
})

test('linha do material: cards automáticos e motivo do bloqueio', async ({ page }) => {
  const row = page.getByTestId('material-row').filter({ hasText: 'Outro PDF' })
  const state = row.getByTestId('material-cards-state')

  setRowDocument(seed.rowDocId, { auto_cards_status: 'skipped_quota', blocked_reason: null })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  // The paid plan (this user is Pro) at its monthly limit: the day the count starts again, never "Ver planos" (prd-uso-justo RN-3)
  await expect(state).toContainText('Sem gerações de cards este mês. A contagem recomeça em')
  await expect(state.getByRole('button', { name: 'Ver planos' })).toHaveCount(0)

  setRowDocument(seed.rowDocId, { auto_cards_status: 'skipped_empty' })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  await expect(state).toContainText('Texto curto demais para gerar cards')

  setRowDocument(seed.rowDocId, { auto_cards_status: 'failed' })
  await page.route(new RegExp(`/api/documents/${seed.rowDocId}/generate-cards$`), r => r.fulfill({ status: 202, json: { data: {} } }))
  await page.route(new RegExp(`/api/documents/${seed.rowDocId}$`), async (r) => {
    const res = await r.fetch()
    const json = await res.json()
    json.data.auto_cards_status = 'generating'
    await r.fulfill({ response: res, json })
  })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  await expect(state).toContainText('Não conseguimos criar os cards')
  await state.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(state).toContainText('Criando os cards das primeiras partes')
  await page.unroute(new RegExp(`/api/documents/${seed.rowDocId}$`))

  setRowDocument(seed.rowDocId, { auto_cards_status: null, note_generation_status: null, blocked_reason: 'feature_limit' })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  await expect(row).toContainText('Limite do mês atingido')
  setRowDocument(seed.rowDocId, { blocked_reason: 'pages_cap' })
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  await expect(row).toContainText('Limite de leitura da IA atingido este mês')
  setRowDocument(seed.rowDocId, { note_generation_status: 'completed', blocked_reason: null })
})

test('revisão: a origem do card diz a parte e a página do início dela', async ({ page }) => {
  await gotoApp(page, `/revisar?scope=note:${seed.noteIds[1]}`)
  await page.keyboard.press('Space')
  await expect(page.getByTestId('review-answer')).toBeVisible()
  await expect(page.getByTestId('review-card')).toContainText('parte 2 de 3, p. 9')
})

test('+ Adicionar: o texto dos cards automáticos diz o custo', async ({ page }) => {
  await gotoApp(page, `/cadernos/${seed.rootId}`)
  await page.getByRole('button', { name: 'Adicionar' }).first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('checkbox', { name: /Gerar cards automaticamente/ })).toBeVisible()
  await expect(sheet).toContainText('Usa 1 geração para o material todo (as 4 primeiras partes).')
})

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    test(`axe no material em partes: ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* intencional: sem storage */ } }, theme)
      await gotoApp(page, partUrl(1))
      await expect(title(page)).toHaveText('Direitos e garantias')
      await expect(page.getByTestId('part-nav')).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
      expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
