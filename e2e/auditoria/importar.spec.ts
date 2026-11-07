import path from 'node:path'
import { test, expect, gotoApp, sql, USERS } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Importar .apkg (fixtures copiadas de memorai-api/tests/fixtures: test_deck.apkg, formato antigo, e anki/novo.apkg,
 * formato do Anki 23.10+ com collection.anki21b em zstd, gerado por memorai-api/scripts/anki-fixtures/gerar.py).
 * O upload é real (POST /import/anki só grava o arquivo); preview, confirmação e status são mockados:
 * sem worker no ambiente, o PreviewAnkiJob nunca rodaria (e o GET real o enfileiraria).
 */
test.use({ auditUser: 'free' })

const APKG = path.join(__dirname, 'fixtures', 'test_deck.apkg')
const APKG_NOVO = path.join(__dirname, 'fixtures', 'anki-novo.apkg')
const fileInput = (page: Page) => page.locator('input[type="file"][accept=".apkg"]')

const preview = {
  decks: [{ name: 'Test Deck', cards_count: 3, conflict: false }],
  total_notes: 3,
  total_cards: 3,
  tags: ['biologia'],
  media_count: 0,
  note_types: { Basic: 2, Cloze: 1, Other: 0 },
  mapping: { destination: { type: 'new' }, caderno: 'Test Deck', materias: [], cadernos: [{ name: 'Test Deck', cards: 3, materias: [] }], deep_paths: 0, tags: 1, cards: 3 },
}

async function mockImportFlow(page: Page, final: 'completed' | 'failed') {
  let polls = 0
  await page.route(/\/api\/import\/[^/]+\/preview$/, route => route.fulfill({ json: { data: preview } }))
  await page.route(/\/api\/import\/[^/]+\/confirm$/, route => route.fulfill({ json: { data: { status: 'confirmed' } } }))
  await page.route(/\/api\/import\/[^/]+\/status$/, (route) => {
    polls++
    if (polls < 2) return route.fulfill({ json: { data: { status: 'processing', current_step: 'importing_cards', total_cards: 3, imported_cards: 1, progress_percent: 33 } } })
    return route.fulfill({ json: { data: final === 'completed'
      ? { status: 'completed', progress_percent: 100, stats: { decks_created: 1, cards_created: 3, topics_created: 1, media_extracted: 0 }, root_topic_id: null, root_topic_ids: [] }
      : { status: 'failed', error: 'O arquivo tem um tipo de nota não suportado.' } } })
  })
}

test.describe('Importar Anki — caminho feliz', () => {
  test('upload real do .apkg → preview → confirmar → progresso → concluído', async ({ page }) => {
    await mockImportFlow(page, 'completed')
    await gotoApp(page, '/importar')
    const upload = page.waitForResponse(r => r.url().endsWith('/api/import/anki') && r.request().method() === 'POST')
    await fileInput(page).setInputFiles(APKG)
    expect((await upload).status()).toBe(201)
    expect(Number(sql(`select count(*) from anki_imports a join users u on u.id=a.user_id where u.email='${USERS.free.email}'`))).toBeGreaterThan(0)

    await expect(page.getByText('Prévia da importação')).toBeVisible()
    await expect(page.getByText('Caderno: Test Deck')).toBeVisible()
    await expect(page.getByText('Lacuna: 1')).toBeVisible()
    await page.getByRole('button', { name: 'Importar 3 cards' }).click()
    await expect(page.getByRole('heading', { name: 'Importando…' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Importação concluída!' })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: 'Ver cadernos' }).click()
    await expect(page).toHaveURL(/\/cadernos/)
  })

  test('formato novo do Anki (anki21b): upload aceito e preview, sem pedir compatibilidade', async ({ page }) => {
    await mockImportFlow(page, 'completed')
    await gotoApp(page, '/importar')
    await expect(page.getByTestId('import-hint')).toContainText('Arquivo → Exportar → Pacote de baralho (.apkg)')
    await expect(page.getByText(/compatibilidade|versões antigas/i)).toHaveCount(0)
    const upload = page.waitForResponse(r => r.url().endsWith('/api/import/anki') && r.request().method() === 'POST')
    await fileInput(page).setInputFiles(APKG_NOVO)
    expect((await upload).status()).toBe(201)
    await expect(page.getByText('Prévia da importação')).toBeVisible()
  })

  test('cancelar no preview volta para a seleção de arquivo', async ({ page }) => {
    await mockImportFlow(page, 'completed')
    await gotoApp(page, '/importar')
    await fileInput(page).setInputFiles(APKG)
    await expect(page.getByText('Prévia da importação')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Selecione seu arquivo .apkg')).toBeVisible()
  })
})

test.describe('Importar Anki — caminho triste', () => {
  test('extensão errada é recusada no cliente, sem upload', async ({ page }) => {
    let uploads = 0
    await page.route('**/api/import/anki', (r) => { uploads++; return r.fallback() })
    await gotoApp(page, '/importar')
    // accept=".apkg" filtra o seletor nativo, mas arrastar/forçar ainda entrega outro arquivo
    await fileInput(page).setInputFiles({ name: 'baralho.zip', mimeType: 'application/zip', buffer: Buffer.from('PK\u0003\u0004') })
    await expect(page.getByTestId('import-file-error')).toHaveText(/não é um \.apkg.*Pacote de baralho/)
    expect(uploads).toBe(0)
  })

  test('.apkg com conteúdo inválido (texto): API recusa e a mensagem aparece em português', async ({ page }) => {
    await gotoApp(page, '/importar')
    const upload = page.waitForResponse(r => r.url().endsWith('/api/import/anki'))
    await fileInput(page).setInputFiles({ name: 'corrompido.apkg', mimeType: 'application/octet-stream', buffer: Buffer.from('isto não é um zip do anki\n'.repeat(20)) })
    const res = await upload
    const error = page.getByTestId('import-file-error')
    if (res.status() === 422) {
      await expect(error).toBeVisible()
      await expect(error).toHaveText(/Arquivo (→|>) Exportar/)
      await expect(error).not.toHaveText(/The file|must be|mimetypes/i)
    } else {
      // Aceito no upload: a validação fica para o job de preview (sem worker aqui) — o usuário espera até 60 s
      test.info().annotations.push({ type: 'observação', description: `upload de .apkg inválido respondeu ${res.status()}: só o PreviewAnkiJob vai descobrir que o arquivo é inválido` })
      expect(res.status(), 'arquivo que não é zip deveria ser recusado no upload').toBe(422)
    }
    await expect(page.getByText('Selecione seu arquivo .apkg')).toBeVisible()
  })

  test('.apkg binário que não é zip: upload deveria recusar (hoje só o job de preview descobre)', async ({ page }) => {
    // Mock do preview: evita enfileirar o PreviewAnkiJob real
    await page.route(/\/api\/import\/[^/]+\/preview$/, route => route.fulfill({ status: 422, json: { message: 'Não foi possível ler o arquivo .apkg.' } }))
    await gotoApp(page, '/importar')
    const upload = page.waitForResponse(r => r.url().endsWith('/api/import/anki'))
    const junk = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7919) % 256))
    await fileInput(page).setInputFiles({ name: 'binario.apkg', mimeType: 'application/octet-stream', buffer: junk })
    const status = (await upload).status()
    test.info().annotations.push({ type: 'evidência', description: `POST /import/anki com bytes aleatórios → ${status}` })
    // ImportAnkiRequest aceita application/octet-stream sem checar a assinatura ZIP (PK\x03\x04)
    expect(status, 'arquivo não-zip aceito no upload').toBe(422)
  })

  test('preview falha (arquivo corrompido detectado no job): a mensagem da API fica na tela e volta ao início', async ({ page }) => {
    const message = 'Não conseguimos ler este arquivo do Anki. No Anki, use Arquivo → Exportar → "Pacote de baralho (.apkg)" e envie o arquivo de novo.'
    await page.route(/\/api\/import\/[^/]+\/preview$/, route => route.fulfill({ status: 422, json: { message } }))
    await gotoApp(page, '/importar')
    await fileInput(page).setInputFiles(APKG)
    await expect(page.getByTestId('import-file-error')).toHaveText(message)
    await expect(page.getByTestId('import-file-error')).toHaveAttribute('role', 'alert')
    await expect(page.getByText('Selecione seu arquivo .apkg')).toBeVisible()
    // Persiste (não é toast) até a próxima tentativa
    await page.waitForTimeout(6_000)
    await expect(page.getByTestId('import-file-error')).toBeVisible()
  })

  test('importação falha no processamento: "Erro na importação" com "Tentar novamente"', async ({ page }) => {
    await mockImportFlow(page, 'failed')
    await gotoApp(page, '/importar')
    await fileInput(page).setInputFiles(APKG)
    await page.getByRole('button', { name: 'Importar 3 cards' }).click()
    await expect(page.getByRole('heading', { name: 'Erro na importação' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('O arquivo tem um tipo de nota não suportado.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })
})
