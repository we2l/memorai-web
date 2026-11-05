import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import MoveDialog from '~/components/caderno/MoveDialog.vue'
import TrashDialog from '~/components/caderno/TrashDialog.vue'
import CardSelectionBar from '~/components/cards/CardSelectionBar.vue'
import Lixeira from '~/pages/cadernos/lixeira.vue'
import Importar from '~/pages/importar.vue'
import type { Topic, TrashBatch } from '~/types'
import { useImportStore } from '~/stores/import'
import { useNoteStore } from '~/stores/note'
import { useTopicStore } from '~/stores/topic'
import { axeViolations } from './ui/axe'

const { apiMock, navigateMock } = vi.hoisted(() => ({ apiMock: vi.fn(), navigateMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('navigateTo', () => navigateMock)

enableAutoUnmount(afterEach)

const topic = (id: string, children: Topic[] = [], parent_id: string | null = null) => ({ id, name: id.toUpperCase(), parent_id, children }) as unknown as Topic
const refused = (status: number, data: unknown) => Object.assign(new Error('x'), { response: { status }, status, data })

function route(handlers: Record<string, unknown>) {
  apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
    const key = `${opts?.method ?? 'GET'} ${url}`
    if (!(key in handlers)) return Promise.reject(new Error(`sem mock: ${key}`))
    const v = handlers[key]
    return v instanceof Error ? Promise.reject(v) : Promise.resolve(v)
  })
}

const q = (s: string) => document.body.querySelector<HTMLElement>(s)
const button = (name: string) => [...document.body.querySelectorAll<HTMLElement>('button, a')].find(b => b.textContent?.trim() === name)
const toastTexts = () => useToast().state.items.map(i => i.message)

beforeEach(() => {
  apiMock.mockReset()
  navigateMock.mockReset()
  useToast().state.items.splice(0)
})
afterEach(() => { document.body.innerHTML = '' })

describe('CadernoMoveDialog (RF-F15)', () => {
  async function mount(item: InstanceType<typeof MoveDialog>['$props']['item'], handlers: Record<string, unknown> = {}) {
    route({ 'GET /topics': { data: [] }, ...handlers })
    useTopicStore().tree = [topic('a', [topic('b', [topic('c', [], 'b')], 'a'), topic('d', [], 'a')]), topic('e')]
    const w = await mountSuspended(MoveDialog, { attachTo: document.body, props: { modelValue: true, item } })
    await flushPromises()
    return w
  }
  const radio = (name: string) => [...document.body.querySelectorAll('label')].find(l => l.textContent?.includes(name))?.querySelector('input') as HTMLInputElement

  it('destinos inválidos desabilitados, com o motivo à vista', async () => {
    await mount({ kind: 'topic', id: 'b', name: 'B', parentId: 'a' })
    expect(radio('D').disabled).toBe(true)
    expect(q('[data-testid="move-targets"]')?.textContent).toContain('passaria de 2 níveis')
    expect(radio('A').disabled).toBe(true)
    expect(q('[data-testid="move-targets"]')?.textContent).toContain('é o lugar atual')
    expect(radio('E').disabled).toBe(false)
    expect(radio('Virar um caderno').disabled).toBe(false)
  })

  it('sem escolha: pede um destino e não chama a API', async () => {
    await mount({ kind: 'note', id: 'n1', name: 'N', topicId: 'a' })
    apiMock.mockClear()
    q('[data-testid="move-confirm"]')!.click()
    await flushPromises()
    expect(q('[data-testid="move-error"]')?.textContent).toContain('Escolha um destino.')
    expect(apiMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: 'note', id: 'n1', name: 'N', topicId: 'a' }, 'PUT /notes/n1', { topic_id: 'e' }],
    [{ kind: 'pdf', id: 'd1', name: 'P', topicId: 'a' }, 'PATCH /documents/d1', { topic_id: 'e' }],
    [{ kind: 'topic', id: 'd', name: 'D', parentId: 'a' }, 'PUT /topics/d', { parent_id: 'e' }],
    [{ kind: 'cards', ids: ['1', '2'], topicIds: ['a'] }, 'POST /flashcards/move', { card_ids: ['1', '2'], topic_id: 'e' }],
  ] as const)('move %#: a chamada certa, o toast e o evento', async (item, key, body) => {
    const w = await mount(item as never, { [key]: { data: { moved: 2 } } })
    radio('E').click()
    await flushPromises()
    q('[data-testid="move-confirm"]')!.click()
    await flushPromises()
    const [method, url] = key.split(' ')
    expect(apiMock).toHaveBeenCalledWith(url, expect.objectContaining({ method, body }))
    expect(w.emitted('moved')![0]![0]).toMatchObject({ id: 'e', name: 'E' })
    expect(toastTexts().join()).toMatch(item.kind === 'cards' ? /2 cards movidos para E/ : /Movido para E/)
  })

  it('"Virar um caderno" manda parent_id null', async () => {
    await mount({ kind: 'topic', id: 'd', name: 'D', parentId: 'a' }, { 'PUT /topics/d': { data: {} } })
    radio('Virar um caderno').click()
    await flushPromises()
    q('[data-testid="move-confirm"]')!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/topics/d', expect.objectContaining({ body: { parent_id: null } }))
    expect(toastTexts().join()).toContain('“D” agora é um caderno.')
  })

  it('422 exam_coverage fica no diálogo, com a prova e o link', async () => {
    const w = await mount({ kind: 'topic', id: 'd', name: 'D', parentId: 'a' }, {
      'PUT /topics/d': refused(422, { code: 'exam_coverage', message: 'cru', requirement: { exam: { id: 'x', title: 'TRF 2027', exam_date: '2026-11-12' } } }),
    })
    radio('E').click()
    await flushPromises()
    q('[data-testid="move-confirm"]')!.click()
    await flushPromises()
    const error = q('[data-testid="move-error"]')!
    expect(error.getAttribute('role')).toBe('alert')
    expect(error.textContent).toContain('A prova “TRF 2027” (12/11/2026)')
    expect(error.querySelector('a')?.getAttribute('href')).toBe('/progresso#provas')
    expect(w.emitted('moved')).toBeUndefined()
  })

  it('axe', async () => {
    await mount({ kind: 'topic', id: 'b', name: 'B', parentId: 'a' })
    expect(await axeViolations(document.body)).toEqual([])
  })
})

describe('CadernoTrashDialog (RF-F16)', () => {
  const receipt = { trash_batch_id: 'tb1', purge_at: '2026-12-02T03:00:00Z', counts: {} }
  const preview = { subjects: 8, materials: 14, cards: 2200, reviews: 5000, quizzes: 3, podcasts: 0 }
  const mount = (item: unknown) => mountSuspended(TrashDialog, { attachTo: document.body, props: { modelValue: true, item: item as never } })

  it('caderno: a prévia vem de delete-preview, com o que continua na biblioteca', async () => {
    route({ 'GET /topics/t1/delete-preview': { data: preview } })
    await mount({ kind: 'topic', id: 't1', name: 'TRF', depth: 0 })
    await flushPromises()
    expect(document.body.textContent).toContain('Mandar “TRF” para a lixeira?')
    expect(document.body.textContent).toContain('Vão junto 8 matérias e assuntos, 14 materiais e 2.200 cards. Você pode restaurar por 30 dias.')
    expect(q('[data-testid="trash-keeps"]')?.textContent).toContain('3 simulados continuam na biblioteca')
  })

  it('prévia que falhou não inventa números e ainda deixa mandar', async () => {
    route({ 'GET /topics/t1/delete-preview': refused(500, {}) })
    await mount({ kind: 'topic', id: 't1', name: 'TRF', depth: 0 })
    await flushPromises()
    expect(document.body.textContent).toContain('Vai junto tudo o que está dentro.')
    expect(button('Mandar para a lixeira')).toBeTruthy()
  })

  it('nota: diz que os cards vão junto (não que ficam) e o toast desfaz com o lote', async () => {
    route({ 'DELETE /notes/n1': { data: receipt }, 'POST /trash/tb1/restore': { data: { id: 'tb1' } }, 'GET /topics': { data: [] } })
    const w = await mount({ kind: 'note', id: 'n1', name: 'Resumo', counts: { cards: 12 }, restoreTo: '/cadernos/t1/material/n1' })
    await flushPromises()
    expect(document.body.textContent).toContain('Vão junto 12 cards.')
    expect(document.body.textContent).not.toContain('continuam na biblioteca')
    button('Mandar para a lixeira')!.click()
    await flushPromises()
    expect(useNoteStore().notes).toEqual([])
    expect(w.emitted('trashed')![0]![0]).toEqual(receipt)
    const toast = useToast().state.items.at(-1)!
    expect(toast.message).toBe('“Resumo” foi para a lixeira.')
    expect(toast.duration).toBe(10_000)
    expect(toast.action?.label).toBe('Desfazer')
    await toast.action!.onClick()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/trash/tb1/restore', expect.objectContaining({ method: 'POST' }))
    expect(navigateMock).toHaveBeenCalledWith('/cadernos/t1/material/n1')
    expect(toastTexts().join()).toContain('“Resumo” voltou.')
  })

  it('PDF: DELETE /documents e as partes na frase', async () => {
    route({ 'DELETE /documents/d1': { message: 'ok', data: receipt }, 'GET /topics': { data: [] } })
    await mount({ kind: 'pdf', id: 'd1', name: 'Apostila', counts: { parts: 6, cards: 148 } })
    expect(document.body.textContent).toContain('Vão junto 6 partes e 148 cards.')
    button('Mandar para a lixeira')!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/documents/d1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('desfazer recusado (409): diz por quê, com a lixeira como próximo passo', async () => {
    route({ 'DELETE /notes/n1': { data: receipt }, 'POST /trash/tb1/restore': refused(409, { code: 'parent_in_trash' }) })
    await mount({ kind: 'note', id: 'n1', name: 'Resumo', counts: {} })
    button('Mandar para a lixeira')!.click()
    await flushPromises()
    await useToast().state.items.at(-1)!.action!.onClick()
    await flushPromises()
    const toast = useToast().state.items.at(-1)!
    expect(toast.type).toBe('error')
    expect(toast.message).toContain('Restaure-o primeiro')
    expect(toast.action?.label).toBe('Abrir a lixeira')
  })
})

describe('/cadernos/lixeira (RF-F16)', () => {
  const batch = (over: Partial<TrashBatch> = {}): TrashBatch => ({
    id: 'tb1', kind: 'topic', item_id: 't1', title: 'TRF', deleted_at: '2026-11-02T14:00:00Z', purge_at: new Date(Date.now() + 23 * 864e5 - 1000).toISOString(),
    counts: { subjects: 8, materials: 14, cards: 2200 }, origin: null, ...over,
  })
  async function mount(batches: TrashBatch[], handlers: Record<string, unknown> = {}) {
    route({ 'GET /trash': { data: batches }, 'GET /topics': { data: [] }, ...handlers })
    const w = await mountSuspended(Lixeira, { attachTo: document.body })
    await flushPromises()
    return w
  }

  it('linhas com tipo, o que foi junto e "apaga em N dias"', async () => {
    await mount([batch(), batch({ id: 'tb2', kind: 'note', item_id: 'n1', title: 'Resumo', counts: { subjects: 0, materials: 1, cards: 3 }, origin: { id: 't2', name: 'Inglês', in_trash: false } })])
    const rows = document.body.querySelectorAll('[data-testid="trash-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.textContent).toContain('Caderno · 8 matérias e assuntos, 14 materiais e 2.200 cards · apaga em 23 dias')
    expect(rows[1]!.textContent).toContain('Nota · em Inglês · 3 cards')
    expect(rows[0]!.querySelector('.bg-action.text-on-action')).toBeNull()
  })

  it('vazia: diz o que aparece aqui', async () => {
    await mount([])
    expect(q('[data-testid="trash-empty"]')?.textContent).toContain('A lixeira está vazia')
  })

  it('Restaurar tira a linha e oferece abrir', async () => {
    let served = [batch()]
    route({ 'POST /trash/tb1/restore': { data: batch() }, 'GET /topics': { data: [] } })
    const impl = apiMock.getMockImplementation()!
    apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/trash') return Promise.resolve({ data: served })
      if (url.endsWith('/restore')) served = []
      return impl(url, opts)
    })
    await mountSuspended(Lixeira, { attachTo: document.body })
    await flushPromises()
    button('Restaurar')!.click()
    await flushPromises()
    expect(document.body.querySelectorAll('[data-testid="trash-row"]')).toHaveLength(0)
    const toast = useToast().state.items.at(-1)!
    expect(toast.message).toBe('“TRF” voltou.')
    toast.action!.onClick()
    expect(navigateMock).toHaveBeenCalledWith('/cadernos/t1')
  })

  it('409 parent_in_trash: "Restaure … primeiro" na linha, com o botão do lote do pai', async () => {
    const child = batch({ id: 'tb2', item_id: 't2', title: 'Constitucional', counts: { cards: 1 }, origin: { id: 't1', name: 'TRF', in_trash: true } })
    await mount([child, batch()], { 'POST /trash/tb2/restore': refused(409, { code: 'parent_in_trash', message: 'cru' }) })
    button('Restaurar')!.click()
    await flushPromises()
    const problem = q('[data-testid="trash-problem"]')!
    expect(problem.getAttribute('role')).toBe('alert')
    expect(problem.textContent).toContain('Restaure “TRF” primeiro')
    expect(problem.textContent).toContain('Restaurar TRF')
    expect(document.body.querySelectorAll('[data-testid="trash-row"]')).toHaveLength(2)
  })

  it('409 sem linha do pai: não aponta um lugar errado nem um botão que não existe', async () => {
    const part = batch({ id: 'tb3', kind: 'note', item_id: 'n1', title: 'Parte 2', counts: { cards: 1 }, origin: { id: 't9', name: 'Direito', in_trash: false } })
    await mount([part], { 'POST /trash/tb3/restore': refused(409, { code: 'parent_in_trash' }) })
    button('Restaurar')!.click()
    await flushPromises()
    const problem = q('[data-testid="trash-problem"]')!
    expect(problem.textContent).toContain('Restaure primeiro a linha que o contém')
    expect(problem.textContent).not.toContain('Direito')
    expect(problem.querySelector('button')).toBeNull()
  })

  it('restaurar o pai limpa o problema do filho, sem o esqueleto e com a lista relida', async () => {
    const parent = batch()
    const child = batch({ id: 'tb2', item_id: 't2', title: 'Constitucional', counts: { cards: 1 }, origin: { id: 't1', name: 'TRF', in_trash: true } })
    let served = [child, parent]
    apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/trash') return Promise.resolve({ data: served })
      if (url === '/topics') return Promise.resolve({ data: [] })
      if (url === '/trash/tb2/restore') return Promise.reject(refused(409, { code: 'parent_in_trash' }))
      if (url === '/trash/tb1/restore' && opts?.method === 'POST') {
        served = [{ ...child, origin: { id: 't1', name: 'TRF', in_trash: false } }]
        return Promise.resolve({ data: parent })
      }
      return Promise.reject(new Error(`sem mock: ${url}`))
    })
    await mountSuspended(Lixeira, { attachTo: document.body })
    await flushPromises()
    button('Restaurar')!.click()
    await flushPromises()
    button('Restaurar TRF')!.click()
    await flushPromises()
    expect(q('[data-testid="trash-problem"]')).toBeNull()
    expect(q('[data-testid="trash-list"]')).not.toBeNull()
    expect(q('[data-testid="trash-row"]')?.textContent).not.toContain('também na lixeira')
    expect(document.activeElement?.hasAttribute('data-trash-restore')).toBe(true)
  })

  it('item que já saiu da lixeira (404): a linha vai embora, com o aviso', async () => {
    await mount([batch()], { 'POST /trash/tb1/restore': refused(404, {}) })
    button('Restaurar')!.click()
    await flushPromises()
    expect(toastTexts().join()).toContain('não está mais na lixeira')
  })

  it('caderno com material excluído antes: "Apagar agora" avisa que ele vai junto', async () => {
    const note = batch({ id: 'tb2', kind: 'note', item_id: 'n1', title: 'Resumo', counts: { subjects: 0, materials: 1, cards: 5 }, origin: { id: 't1', name: 'TRF', in_trash: true } })
    await mount([batch({ counts: { subjects: 1, materials: 1, cards: 3 } }), note])
    const row = document.body.querySelectorAll('[data-testid="trash-row"]')[1]!
    expect(row.textContent).toContain('Nota · em TRF (também na lixeira) · 5 cards')
    button('Apagar agora')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Materiais que você excluiu antes, de dentro dele, também são apagados.')
  })

  it('"Desfazer" de um toast com a lixeira aberta relê as linhas', async () => {
    await mount([batch()])
    apiMock.mockClear()
    useState<number>('trash-version', () => 0).value++
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/trash')
  })

  it('422 exam_coverage: aponta a prova na linha', async () => {
    await mount([batch()], { 'POST /trash/tb1/restore': refused(422, { code: 'exam_coverage', requirement: { exam: { id: 'x', title: 'TRF 2027', exam_date: '2026-11-12' } } }) })
    button('Restaurar')!.click()
    await flushPromises()
    const problem = q('[data-testid="trash-problem"]')!
    expect(problem.textContent).toContain('A prova “TRF 2027” (12/11/2026)')
    expect(problem.querySelector('a')?.getAttribute('href')).toBe('/progresso#provas')
  })

  it('Apagar agora confirma; caderno grande pede o nome', async () => {
    let served = [batch()]
    apiMock.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/trash') return Promise.resolve({ data: served })
      if (url === '/trash/tb1' && opts?.method === 'DELETE') {
        served = []
        return Promise.resolve(undefined)
      }
      return Promise.reject(new Error(`sem mock: ${url}`))
    })
    await mountSuspended(Lixeira, { attachTo: document.body })
    await flushPromises()
    button('Apagar agora')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Não dá para desfazer.')
    expect(button('Apagar de vez')?.getAttribute('aria-disabled') ?? button('Apagar de vez')?.hasAttribute('disabled')).toBeTruthy()
    apiMock.mockClear()
    const input = document.body.querySelector<HTMLInputElement>('[role="alertdialog"] input')!
    input.value = 'TRF'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    button('Apagar de vez')!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/trash/tb1', expect.objectContaining({ method: 'DELETE' }))
    expect(document.body.querySelectorAll('[data-testid="trash-row"]')).toHaveLength(0)
  })

  it('axe', async () => {
    await mount([batch()])
    expect(await axeViolations(document.body)).toEqual([])
  })
})

describe('/importar (RF-F17)', () => {
  const preview = {
    decks: [{ name: 'Inglês', cards_count: 3, conflict: true }], total_notes: 3, total_cards: 3, tags: ['a'], media_count: 2, note_types: { Basic: 2, Cloze: 1, Other: 0 },
    mapping: { destination: { type: 'new' }, caderno: 'Inglês', materias: [], cadernos: [{ name: 'Inglês', cards: 3, materias: [{ name: 'Vocabulary', cards: 2, assuntos: [] }, { name: 'Grammar', cards: 1, assuntos: [] }] }], deep_paths: 14, tags: 230, cards: 3 },
  }

  async function atPreview(url = '/importar') {
    const w = await mountSuspended(Importar, { attachTo: document.body, route: url })
    const store = useImportStore()
    store.importId = 'imp1'
    store.preview = preview as never
    store.deckConflicts = { Inglês: 'import' }
    await flushPromises()
    return { w, store }
  }

  it('prévia com o mapeamento, sem seletor quando não veio de um caderno', async () => {
    route({})
    await atPreview()
    expect(q('[data-testid="import-mapping"]')?.textContent).toContain('Caderno: Inglês · Matérias: Vocabulary, Grammar')
    expect(q('[data-testid="import-tags"]')?.textContent).toBe('14 caminhos mais fundos e 230 etiquetas viram etiquetas')
    expect(q('[data-testid="import-summary"]')?.textContent).toContain('Lacuna: 1')
    expect(q('[data-testid="import-destination"]')).toBeNull()
  })

  it('confirmar sem destino escolhido = caderno novo', async () => {
    route({ 'POST /import/imp1/confirm': { data: {} }, 'GET /import/imp1/status': { data: { status: 'processing' } } })
    await atPreview()
    q('[data-testid="import-confirm"]')!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/import/imp1/confirm', expect.objectContaining({ body: { deck_conflicts: { Inglês: 'import' }, destination: { type: 'new' } } }))
  })

  it('de um caderno: "Caderno novo" é o padrão e "Dentro de" relê o mapeamento e vai no confirm', async () => {
    route({ 'GET /import/imp1/preview': { data: { ...preview, mapping: { ...preview.mapping, destination: { type: 'existing', topic_id: 't1' } } } }, 'POST /import/imp1/confirm': { data: {} }, 'GET /import/imp1/status': { data: { status: 'processing' } } })
    useTopicStore().tree = [topic('t1')]
    await atPreview('/importar?topic_id=t1')
    const radios = [...document.body.querySelectorAll<HTMLInputElement>('[data-testid="import-destination"] input, fieldset input[type="radio"]')]
    expect(radios[0]!.checked).toBe(true)
    expect(document.body.textContent).toContain('Dentro de T1')
    radios[1]!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/import/imp1/preview', expect.objectContaining({ params: { topic_id: 't1' } }))
    q('[data-testid="import-confirm"]')!.click()
    await flushPromises()
    expect(apiMock).toHaveBeenCalledWith('/import/imp1/confirm', expect.objectContaining({ body: expect.objectContaining({ destination: { type: 'existing', topic_id: 't1' } }) }))
  })

  it('baralho em "Pular" sai do número do botão; todos pulados, nada a importar', async () => {
    route({})
    const { store } = await atPreview()
    expect(q('[data-testid="import-confirm"]')?.textContent).toContain('Importar 3 cards')
    store.deckConflicts = { Inglês: 'skip' }
    await flushPromises()
    expect(q('[data-testid="import-confirm"]')?.textContent).toContain('Importar 0 cards')
    expect(q('[data-testid="import-confirm"]')?.getAttribute('aria-disabled') ?? q('[data-testid="import-confirm"]')?.hasAttribute('disabled')).toBeTruthy()
  })

  it('destino na lixeira: texto com próximo passo, nunca o 422 cru', async () => {
    route({ 'POST /import/imp1/confirm': refused(422, { code: 'destination_in_trash', message: 'cru' }) })
    await atPreview()
    q('[data-testid="import-confirm"]')!.click()
    await flushPromises()
    expect(q('[data-testid="import-error"]')?.textContent).toContain('O destino está na lixeira')
    expect(q('[data-testid="import-error"] a')?.getAttribute('href')).toBe('/cadernos/lixeira')
  })

  it('fim: "N cards e o histórico vieram · M para hoje", Revisar e Abrir o caderno pelo root_topic_id', async () => {
    route({ 'GET /review/session-count?scope=topic%3Ar1': { data: { session_count: 45 } }, 'GET /review/session-count?scope=topic:r1': { data: { session_count: 45 } }, 'GET /topics': { data: [] } })
    await mountSuspended(Importar, { attachTo: document.body, route: '/importar' })
    const store = useImportStore()
    store.importId = 'imp1'
    store.status = { status: 'completed', root_topic_id: 'r1', root_topic_ids: ['r1'], stats: { decks_created: 1, cards_created: 3000, topics_created: 4, media_extracted: 0 } }
    await flushPromises()
    expect(q('[data-testid="import-done-summary"]')?.textContent).toBe('3.000 cards e o histórico vieram · 45 para hoje')
    expect(q('[data-testid="import-open"]')?.getAttribute('href')).toBe('/cadernos/r1')
    expect(q('[data-testid="import-review"]')?.getAttribute('href')).toContain('r1')
  })

  it('fim sem cards para hoje: "Abrir o caderno" vira o primário; sem root, "Ver cadernos"', async () => {
    route({ 'GET /review/session-count?scope=topic%3Ar1': { data: { session_count: 0 } }, 'GET /review/session-count?scope=topic:r1': { data: { session_count: 0 } }, 'GET /topics': { data: [] } })
    await mountSuspended(Importar, { attachTo: document.body, route: '/importar' })
    const store = useImportStore()
    store.importId = 'imp1'
    store.status = { status: 'completed', root_topic_id: 'r1', root_topic_ids: ['r1'], stats: { decks_created: 1, cards_created: 3, topics_created: 1, media_extracted: 0 } }
    await flushPromises()
    expect(q('[data-testid="import-review"]')).toBeNull()
    expect(q('[data-testid="import-open"]')?.className).toContain('bg-action')
    store.status = { status: 'completed', stats: { decks_created: 1, cards_created: 3, topics_created: 1, media_extracted: 0 } }
    await flushPromises()
    expect(q('[data-testid="import-open"]')).toBeNull()
    expect(button('Ver cadernos')).toBeTruthy()
  })

  it('axe na prévia', async () => {
    route({})
    useTopicStore().tree = [topic('t1')]
    await atPreview('/importar?topic_id=t1')
    expect(await axeViolations(document.body)).toEqual([])
  })
})

describe('CardsCardSelectionBar: Mover', () => {
  it('emite move; acima de 500 fica desabilitado e diz o limite', async () => {
    const w = await mountSuspended(CardSelectionBar, { props: { count: 3, allSelected: false, reviewTo: '/x' } })
    await w.get('[data-testid="card-selection-move"]').trigger('click')
    expect(w.emitted('move')).toHaveLength(1)
    await w.setProps({ count: 501 })
    expect(w.text()).toContain('Mova até 500 de uma vez.')
    await w.get('[data-testid="card-selection-move"]').trigger('click')
    expect(w.emitted('move')).toHaveLength(1)
  })
})
