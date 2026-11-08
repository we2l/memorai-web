import path from 'node:path'
import { execFileSync } from 'node:child_process'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, sql, USERS } from './support/fixtures'

/**
 * Organização do caderno (prd-4b-caderno-v3 §10.2, tasks 22.1): mover material, matéria e cards; excluir com a prévia;
 * desfazer; lixeira com restaurar e apagar agora; 409 do pai na lixeira; Anki com mapeamento e destino. Tudo contra a
 * API real e nenhuma IA: o .apkg (support/make-apkg.py) é lido e importado pelos jobs da fila `import`, que o teste
 * roda uma vez, só nessa fila.
 */
test.use({ auditUser: 'organizacao' })

const APKG = path.join(__dirname, 'fixtures', 'ingles-niveis.apkg')
const USER = `(select id from users where email='${USERS.organizacao.email}')`
const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name })
const confirmTrash = (page: Page) => page.getByRole('alertdialog').getByRole('button', { name: 'Mandar para a lixeira' })
const toast = (page: Page) => page.getByRole('status')
const trashRow = (page: Page, title: string) => page.getByTestId('trash-row').filter({ hasText: title })
const radio = (page: Page, name: string) => page.getByTestId('move-targets').getByRole('radio', { name, exact: true })

interface Caderno { root: { id: string; name: string }; x: { id: string; name: string }; y: { id: string; name: string }; note: { id: string; title: string } }

/** Caderno with 2 matérias; in X a note with `cards` cards born from it. */
async function caderno(page: Page, cards = 3): Promise<Caderno> {
  const tag = uid()
  const root = (await apiCall(page, 'POST', '/topics', { name: `Caderno ${tag}`, learning_mode: 'exam' })).data
  const x = (await apiCall(page, 'POST', '/topics', { name: `Materia X ${tag}`, parent_id: root.id })).data
  const y = (await apiCall(page, 'POST', '/topics', { name: `Materia Y ${tag}`, parent_id: root.id })).data
  const note = (await apiCall(page, 'POST', `/topics/${x.id}/notes`, { title: `Apostila ${tag}` })).data
  if (cards) await apiCall(page, 'POST', '/ai/accept-cards', { topic_id: x.id, note_id: note.id, cards: Array.from({ length: cards }, (_, i) => ({ front: `Pergunta ${tag} ${i}`, back: `Resposta ${i}` })) })
  return { root, x, y, note }
}

const summary = async (page: Page, id: string) => (await apiCall(page, 'GET', `/topics/${id}/summary`)).data
const topicIds = async (page: Page) => ((await apiCall(page, 'GET', '/topics')).data as { id: string }[]).map(t => t.id)

/** Runs what is queued for the Anki import (no AI there), until empty. */
function runImportQueue() {
  execFileSync('docker', ['exec', process.env.E2E_API_CONTAINER || 'baigi-app', 'php', 'artisan', 'queue:work', 'redis-long', '--queue=import', '--stop-when-empty', '--tries=1', '--timeout=120'], { encoding: 'utf8', timeout: 120_000 })
}

test.describe('Mover', () => {
  test('material: destinos inválidos com o motivo, 3 cards vão junto com origem, FSRS e session_count das duas pontas', async ({ page }) => {
    const { root, x, y, note } = await caderno(page)
    const before = { x: (await summary(page, x.id)).session.count, y: (await summary(page, y.id)).session.count }
    expect(before.x).toBe(3)
    const fsrs = sql(`select string_agg(id || state || coalesce(stability::text,'') || source_note_id, ',' order by id) from flashcards where source_note_id='${note.id}'`)

    await gotoApp(page, `/cadernos/${x.id}`)
    await page.getByRole('button', { name: `Mais ações de ${note.title}` }).click()
    await page.getByRole('menuitem', { name: 'Mover para…' }).click()
    const move = dialog(page, `Mover “${note.title}”`)
    await expect(radio(page, x.name)).toBeDisabled()
    await expect(move.getByText('é o lugar atual')).toBeVisible()
    await radio(page, y.name).check()
    await move.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(toast(page).getByText(`Movido para ${y.name}.`)).toBeVisible()
    await expect(page.getByTestId('material-row')).toHaveCount(0)

    expect(sql(`select string_agg(distinct topic_id::text, ',') from flashcards where source_note_id='${note.id}'`)).toBe(y.id)
    expect(sql(`select string_agg(id || state || coalesce(stability::text,'') || source_note_id, ',' order by id) from flashcards where source_note_id='${note.id}'`)).toBe(fsrs)
    expect((await summary(page, x.id)).session.count).toBe(0)
    expect((await summary(page, y.id)).session.count).toBe(before.y + 3)

    // "Abrir" do toast leva ao destino, com o material lá
    await toast(page).getByRole('button', { name: 'Abrir' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${y.id}$`))
    await expect(page.getByTestId('material-row')).toContainText(note.title)
    expect((await summary(page, root.id)).session.count).toBe(3)
  })

  test('matéria: "passaria de 2 níveis" desabilitado; outro caderno leva cards e deck; prova que cobre → texto apontando a prova', async ({ page }) => {
    const a = await caderno(page, 2)
    const b = await caderno(page, 0)
    await apiCall(page, 'POST', '/topics', { name: `Assunto ${uid()}`, parent_id: a.x.id })

    await gotoApp(page, `/cadernos/${a.root.id}`)
    await page.getByRole('button', { name: `Mais ações de ${a.x.name}` }).click()
    await page.getByRole('menuitem', { name: 'Mover para…' }).click()
    const move = dialog(page, `Mover “${a.x.name}”`)
    await expect(radio(page, a.y.name)).toBeDisabled()
    await expect(move.getByText('passaria de 2 níveis').first()).toBeVisible()
    await expect(radio(page, a.root.name)).toBeDisabled()

    // A prova cobre X e Y: X não sai sozinha para outro caderno
    const exam = (await apiCall(page, 'POST', '/exams', { title: `Prova ${uid()}`, exam_date: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10), topic_ids: [a.x.id, a.y.id] })).data
    await radio(page, b.root.name).check()
    await move.getByRole('button', { name: 'Mover', exact: true }).click()
    const error = page.getByTestId('move-error')
    await expect(error).toContainText(`A prova “${exam.title}”`)
    await expect(error).toContainText('Tire a matéria da prova')
    await expect(error.getByRole('link', { name: 'Ver a prova' })).toHaveAttribute('href', '/progresso#provas')
    await expect(move).toBeVisible()
    await apiCall(page, 'DELETE', `/exams/${exam.id}`)

    await move.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(toast(page).getByText(`Movido para ${b.root.name}.`)).toBeVisible()
    await expect(page.getByTestId('scope-subjects').getByRole('link', { name: new RegExp(a.x.name) })).toHaveCount(0)

    expect(sql(`select count(*) from flashcards f join decks d on d.id=f.deck_id where f.topic_id='${a.x.id}' and d.topic_id='${b.root.id}'`)).toBe('2')
    expect((await summary(page, b.root.id)).session.count).toBe(2)
    expect((await summary(page, a.root.id)).session.count).toBe(0)
  })

  test('cards: seleção na biblioteca → Mover para outra matéria, com o toast e a lista atualizada', async ({ page }) => {
    const { x, y, note } = await caderno(page, 3)
    await gotoApp(page, `/cadernos/${x.id}/cards`)
    const rows = page.getByRole('checkbox', { name: /Selecionar/ })
    await expect(rows).toHaveCount(3)
    await rows.nth(0).check()
    await rows.nth(1).check()
    await page.getByTestId('card-selection-move').click()
    const move = dialog(page, 'Mover 2 cards')
    await expect(radio(page, x.name)).toBeDisabled()
    await radio(page, y.name).check()
    await move.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(toast(page).getByText(`2 cards movidos para ${y.name}.`)).toBeVisible()
    await expect(rows).toHaveCount(1)
    await expect(page.getByTestId('card-selection')).toHaveCount(0)
    expect(sql(`select count(*) from flashcards where topic_id='${y.id}' and source_note_id='${note.id}'`)).toBe('2')
  })
})

test.describe('Excluir e lixeira', () => {
  test('caderno: a prévia diz o que vai junto; depois some da árvore, do Hoje e das contagens e aparece "Lixeira (N)"', async ({ page }) => {
    const { root } = await caderno(page, 3)
    const due = (await apiCall(page, 'GET', '/stats')).data.due_today
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.getByRole('button', { name: `Mais ações de ${root.name}` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm.getByRole('heading', { name: `Mandar “${root.name}” para a lixeira?` })).toBeVisible()
    await expect(confirm).toContainText('Vão junto 2 matérias e assuntos, 1 material e 3 cards. Você pode restaurar por 30 dias.')
    await confirmTrash(page).click()

    await expect(page).toHaveURL(/\/cadernos$/)
    await expect(toast(page).getByText(`“${root.name}” foi para a lixeira.`)).toBeVisible()
    await expect(page.getByTestId('notebook-list').getByRole('link', { name: new RegExp(root.name) })).toHaveCount(0)
    await expect(page.getByTestId('trash-link')).toHaveText(/Lixeira \(\d+\)/)
    expect(await topicIds(page)).not.toContain(root.id)
    expect((await apiCall(page, 'GET', '/stats')).data.due_today).toBe(due - 3)
    // O histórico e os arquivos continuam até o expurgo: só marcou
    expect(sql(`select count(*) from flashcards where topic_id in (select id from topics where trash_batch_id is not null and user_id=${USER} and name like '%${root.name.split(' ')[1]}%')`)).toBe('3')
  })

  test('Desfazer restaura o lote: o caderno volta com os mesmos números, e a nota também volta', async ({ page }) => {
    const { root, x, note } = await caderno(page, 3)
    const before = await summary(page, root.id)
    await gotoApp(page, `/cadernos/${root.id}`)
    await page.getByRole('button', { name: `Mais ações de ${root.name}` }).click()
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await confirmTrash(page).click()
    await expect(page).toHaveURL(/\/cadernos$/)
    await toast(page).getByRole('button', { name: 'Desfazer' }).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${root.id}$`))
    await expect(toast(page).getByText(`“${root.name}” voltou.`)).toBeVisible()
    const after = await summary(page, root.id)
    expect({ counts: after.counts, session: after.session, mastery: after.mastery }).toEqual({ counts: before.counts, session: before.session, mastery: before.mastery })

    // A nota, pela rota do material: o texto diz que os cards vão junto, e Desfazer volta à nota
    await gotoApp(page, `/cadernos/${x.id}/material/${note.id}`)
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('menuitem', { name: 'Excluir nota' }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText('Vão junto 3 cards.')
    await expect(confirm).not.toContainText('continuam')
    await confirmTrash(page).click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${x.id}$`))
    expect((await summary(page, x.id)).counts.cards).toBe(0)
    await toast(page).getByRole('button', { name: 'Desfazer' }).click()
    await expect(page).toHaveURL(new RegExp(`/material/${note.id}$`))
    expect((await summary(page, x.id)).counts.cards).toBe(3)
  })

  test('lixeira: linhas com o tipo e o prazo, Restaurar devolve ao lugar, Apagar agora confirma e apaga de vez', async ({ page }) => {
    const a = await caderno(page, 2)
    const { root: b } = await caderno(page, 1)
    const batchA = (await apiCall(page, 'DELETE', `/topics/${a.x.id}`)).data.trash_batch_id
    const batchB = (await apiCall(page, 'DELETE', `/topics/${b.id}`)).data.trash_batch_id

    await gotoApp(page, '/cadernos')
    await page.getByTestId('trash-link').click()
    await expect(page).toHaveURL(/\/cadernos\/lixeira$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Lixeira' })).toBeVisible()
    await expect(trashRow(page, a.x.name)).toContainText(`Matéria ou assunto · em ${a.root.name}`)
    await expect(trashRow(page, a.x.name)).toContainText(/apaga em (29|30) dias/)
    await expect(trashRow(page, b.name)).toContainText('Caderno')

    await trashRow(page, a.x.name).getByRole('button', { name: `Restaurar ${a.x.name}` }).click()
    await expect(trashRow(page, a.x.name)).toHaveCount(0)
    await expect(toast(page).getByText(`“${a.x.name}” voltou.`)).toBeVisible()
    expect(sql(`select count(*) from trash_batches where id='${batchA}'`)).toBe('0')
    expect((await summary(page, a.root.id)).counts.cards).toBe(2)

    await trashRow(page, b.name).getByRole('button', { name: `Apagar agora ${b.name}` }).click()
    const confirm = page.getByRole('alertdialog')
    await expect(confirm).toContainText('Não dá para desfazer.')
    await confirm.getByRole('button', { name: 'Apagar de vez' }).click()
    await expect(trashRow(page, b.name)).toHaveCount(0)
    await expect(toast(page).getByText(`“${b.name}” foi apagado de vez.`)).toBeVisible()
    expect(sql(`select count(*) from topics where id='${b.id}'`)).toBe('0')
    expect(sql(`select count(*) from trash_batches where id='${batchB}'`)).toBe('0')
  })

  test('409: a matéria cujo caderno está na lixeira pede para restaurar o caderno primeiro, com o botão dele', async ({ page }) => {
    const { root, x } = await caderno(page, 1)
    await apiCall(page, 'DELETE', `/topics/${x.id}`)
    await apiCall(page, 'DELETE', `/topics/${root.id}`)

    await gotoApp(page, '/cadernos/lixeira')
    await expect(trashRow(page, x.name)).toContainText('(também na lixeira)')
    await trashRow(page, x.name).getByRole('button', { name: `Restaurar ${x.name}` }).click()
    const problem = trashRow(page, x.name).getByTestId('trash-problem')
    await expect(problem).toContainText(`Restaure “${root.name}” primeiro`)
    await expect(trashRow(page, x.name)).toBeVisible()

    await problem.getByRole('button', { name: `Restaurar ${root.name}` }).click()
    await expect(trashRow(page, root.name).filter({ hasNotText: x.name })).toHaveCount(0)
    await expect(trashRow(page, x.name)).not.toContainText('(também na lixeira)')
    await trashRow(page, x.name).getByRole('button', { name: `Restaurar ${x.name}` }).click()
    await expect(trashRow(page, x.name)).toHaveCount(0)
    expect((await summary(page, root.id)).counts.cards).toBe(1)
  })
})

test.describe('Anki', () => {
  test('mapeamento e destino: com ?topic_id= começa dentro do caderno, "Caderno novo" na escolha, 0 tópico por etiqueta, fim abre o caderno pelo root_topic_id', async ({ page }) => {
    test.setTimeout(120_000)
    const { root } = await caderno(page, 0)
    const fileInput = page.locator('input[type="file"][accept=".apkg"]')

    await gotoApp(page, `/importar?topic_id=${root.id}`)
    // O 1º GET enfileira o PreviewAnkiJob; a fila roda depois do upload e a tela segue no poll de 2 s
    const previewAsked = page.waitForResponse(r => /\/import\/[^/]+\/preview/.test(r.url()))
    await fileInput.setInputFiles(APKG)
    await previewAsked
    runImportQueue()
    await expect(page.getByText('Prévia da importação')).toBeVisible({ timeout: 15_000 })

    // Decisão do dono: veio de um caderno, o padrão é dentro dele (os baralhos descem um nível)
    const mapping = page.getByTestId('import-mapping')
    const destination = page.getByRole('group', { name: 'Para onde vão os cards' })
    await expect(destination.getByRole('radio', { name: `Dentro de ${root.name}` })).toBeChecked()
    await expect(mapping).toContainText(`Caderno: ${root.name}`)

    // "Caderno novo" relê o mapeamento; voltar relê com o topic_id
    await destination.getByRole('radio', { name: 'Caderno novo' }).check()
    await expect(mapping).toContainText('Caderno: Inglês · Matérias: Vocabulary, Grammar, Listening · 1 assunto')
    await expect(page.getByTestId('import-tags')).toHaveText('1 caminho mais fundo e 230 etiquetas viram etiquetas')
    const reread = page.waitForResponse(r => r.url().includes(`topic_id=${root.id}`) && r.url().includes('/preview'))
    await destination.getByRole('radio', { name: `Dentro de ${root.name}` }).check()
    await reread
    await expect(mapping).toContainText(`Caderno: ${root.name}`)
    await destination.getByRole('radio', { name: 'Caderno novo' }).check()
    await expect(mapping).toContainText('Caderno: Inglês')

    await page.getByTestId('import-confirm').click()
    await expect(page.getByTestId('import-progress')).toBeVisible()
    runImportQueue()
    await expect(page.getByRole('heading', { name: 'Importação concluída!' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('import-done-summary')).toContainText('8 cards e os intervalos vieram · 8 para hoje')

    const created = sql(`select id from topics where user_id=${USER} and parent_id is null and name='Inglês' and deleted_at is null order by created_at desc limit 1`)
    expect(sql(`select count(*) from topics where user_id=${USER} and name like 'tag%'`)).toBe('0')
    expect(sql(`select count(*) from topics where user_id=${USER} and name in ('Fruits','Verbs')`)).toBe('0')
    expect(Number(sql(`select count(*) from flashcards where user_id=${USER} and tags::text like '%tag001%'`))).toBeGreaterThan(0)
    expect(sql(`select count(*) from flashcards where user_id=${USER} and tags::text like '%Fruits%'`)).toBe('1')
    await expect(page.getByTestId('import-review')).toHaveAttribute('href', new RegExp(created))
    await page.getByTestId('import-open').click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${created}$`))
    await expect(page.getByTestId('scope-subjects')).toContainText('Vocabulary')

    // Dentro do caderno aberto: os baralhos viram matérias dele, e nenhum caderno novo nasce
    const roots = sql(`select count(*) from topics where user_id=${USER} and parent_id is null and deleted_at is null`)
    await gotoApp(page, `/importar?topic_id=${root.id}`)
    const asked = page.waitForResponse(r => /\/import\/[^/]+\/preview/.test(r.url()))
    await fileInput.setInputFiles(APKG)
    await asked
    runImportQueue()
    await expect(page.getByText('Prévia da importação')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('group', { name: 'Para onde vão os cards' }).getByRole('radio', { name: `Dentro de ${root.name}` })).toBeChecked()
    await expect(mapping).toContainText(`Caderno: ${root.name}`)
    await page.getByTestId('import-confirm').click()
    await expect(page.getByTestId('import-progress')).toBeVisible()
    runImportQueue()
    await expect(page.getByRole('heading', { name: 'Importação concluída!' })).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('import-open').click()
    await expect(page).toHaveURL(new RegExp(`/cadernos/${root.id}$`))
    expect(sql(`select count(*) from topics where user_id=${USER} and parent_id is null and deleted_at is null`)).toBe(roots)
    expect((await summary(page, root.id)).counts.cards).toBe(8)
  })

  test('?topic_id= de um caderno que a árvore não conhece: sem seletor, caderno novo', async ({ page }) => {
    test.setTimeout(60_000)
    await gotoApp(page, '/importar?topic_id=00000000-0000-4000-8000-000000000000')
    const asked = page.waitForResponse(r => /\/import\/[^/]+\/preview/.test(r.url()))
    await page.locator('input[type="file"][accept=".apkg"]').setInputFiles(APKG)
    expect((await asked).url()).not.toContain('topic_id')
    runImportQueue()
    await expect(page.getByText('Prévia da importação')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('group', { name: 'Para onde vão os cards' })).toHaveCount(0)
    await expect(page.getByTestId('import-mapping')).toContainText('Caderno: Inglês')
  })
})

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
  expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), `axe ${label}`).toEqual([])
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    test(`axe nas telas novas: ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(60_000)
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* intencional: sem storage */ } }, theme)
      const { root, x, y, note } = await caderno(page, 2)

      // Hub com o ⋯ das matérias e o diálogo de mover
      await gotoApp(page, `/cadernos/${root.id}`)
      await page.getByRole('button', { name: `Mais ações de ${x.name}` }).click()
      await axe(page, 'hub com menu')
      await page.getByRole('menuitem', { name: 'Mover para…' }).click()
      await expect(radio(page, y.name)).toBeVisible()
      await axe(page, 'mover')
      await page.getByRole('button', { name: 'Cancelar' }).click()

      // Prévia de excluir
      await page.getByRole('button', { name: `Mais ações de ${root.name}` }).click()
      await page.getByRole('menuitem', { name: 'Excluir' }).click()
      await expect(confirmTrash(page)).toBeEnabled()
      await axe(page, 'excluir')
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click()

      // Lixeira com linhas e o problema da linha
      await apiCall(page, 'DELETE', `/notes/${note.id}`)
      await apiCall(page, 'DELETE', `/topics/${x.id}`)
      await gotoApp(page, '/cadernos/lixeira')
      await expect(page.getByTestId('trash-row').first()).toBeVisible()
      await trashRow(page, note.title).getByRole('button', { name: `Restaurar ${note.title}` }).click()
      await expect(trashRow(page, note.title).getByTestId('trash-problem')).toBeVisible()
      await axe(page, 'lixeira')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem rolagem horizontal na lixeira').toBe(true)
      await apiCall(page, 'POST', `/trash/${(await apiCall(page, 'GET', '/trash')).data.find((b: { item_id: string }) => b.item_id === x.id).id}/restore`)

      // Prévia do Anki, com o seletor de destino
      await page.route(/\/api\/import\/[^/]+\/preview/, route => route.fulfill({ json: { data: {
        decks: [{ name: 'Inglês', cards_count: 8, conflict: true }], total_notes: 8, total_cards: 8, tags: ['a'], media_count: 1, note_types: { Basic: 8, Cloze: 0, Other: 0 },
        mapping: { destination: { type: 'new' }, caderno: 'Inglês', materias: [], cadernos: [{ name: 'Inglês', cards: 8, materias: [{ name: 'Vocabulary', cards: 4, assuntos: [] }] }], deep_paths: 1, tags: 230, cards: 8 },
      } } }))
      await gotoApp(page, `/importar?topic_id=${root.id}`)
      await page.locator('input[type="file"][accept=".apkg"]').setInputFiles(APKG)
      await expect(page.getByTestId('import-mapping')).toBeVisible()
      await axe(page, 'importar')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem rolagem horizontal no importar').toBe(true)
    })
  }
}
