import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import TopNav from '~/components/shell/TopNav.vue'
import BottomNav from '~/components/shell/BottomNav.vue'
import AccountMenu from '~/components/shell/AccountMenu.vue'
import AddSheet from '~/components/shell/AddSheet.vue'
import CommandPalette from '~/components/shell/CommandPalette.vue'
import MiniPlayer from '~/components/shell/MiniPlayer.vue'
import { groupResults, scoreMatch, type CommandItem } from '~/composables/useCommandPalette'
import { axeViolations } from './ui/axe'

const { apiMock, trackMock, navigateToMock, route } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  trackMock: vi.fn(),
  navigateToMock: vi.fn(),
  route: { path: '/hoje', query: {} as Record<string, string>, params: {}, meta: {}, fullPath: '/hoje' },
}))

mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useAnalytics', () => () => ({ track: trackMock, identify: vi.fn(), reset: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
// Plain object: each test sets the route before mounting
mockNuxtImport('useRoute', () => () => route)

enableAutoUnmount(afterEach)
const tick = async () => { await flushPromises(); await nextTick(); await new Promise(r => setTimeout(r, 0)) }

const TREE = [
  { id: 't1', name: 'TRF 4ª Região', parent_id: null, children: [{ id: 't1a', name: 'Direito Constitucional', parent_id: 't1', children: [] }] },
  { id: 't2', name: 'Inglês B2', parent_id: null, children: [] },
]

function setRoute(path: string, query: Record<string, string> = {}) {
  route.path = path
  route.query = query
  route.fullPath = path
}

// In-memory Storage: Node 25 ships its own (inert) localStorage global (see useColorMode.test.ts)
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  useAddSheet().open.value = false
  useAddSheet().preset.value = null
  useAddIntent().value = null
  useCommandPaletteOpen().value = false
  apiMock.mockReset()
  trackMock.mockReset()
  navigateToMock.mockReset()
  document.body.innerHTML = ''
  setRoute('/hoje')
  useAuthStore().user = { id: 'u1', name: 'Rafael Andrade', email: 'rafael@exemplo.com', plan: 'pro' } as any
  useTopicStore().tree = structuredClone(TREE) as any
})

describe('ShellTopNav', () => {
  it('4 lugares na ordem, o ativo pela seção da rota (/revisar acende Praticar), e o clique é medido', async () => {
    setRoute('/revisar')
    const w = await mountSuspended(TopNav)
    const nav = w.get('nav[aria-label="Navegação principal"]')
    const links = nav.findAll('a')
    expect(links.map(l => l.text())).toEqual(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
    expect(links.map(l => l.attributes('aria-current') ?? null)).toEqual([null, null, 'page', null])
    await links[1]!.trigger('click')
    expect(trackMock).toHaveBeenCalledWith('nav_clicked', { item: 'cadernos', surface: 'top' })
  })

  it('"+ Adicionar" abre a folha e "Buscar" abre a busca (com evento)', async () => {
    const w = await mountSuspended(TopNav)
    const buttons = w.findAll('button')
    await buttons.find(b => b.text().includes('Adicionar'))!.trigger('click')
    expect(useAddSheet().open.value).toBe(true)
    expect(trackMock).toHaveBeenCalledWith('add_opened', { origin: 'topnav' })
    await buttons.find(b => b.text().includes('Buscar'))!.trigger('click')
    expect(useCommandPaletteOpen().value).toBe(true)
    expect(trackMock).toHaveBeenCalledWith('search_opened', { origin: 'topnav' })
    useAddSheet().open.value = false
    useCommandPaletteOpen().value = false
  })

  it('/provas acende Progresso; /configuracoes não acende nenhum', async () => {
    setRoute('/provas')
    let w = await mountSuspended(TopNav)
    expect(w.get('a[aria-current="page"]').text()).toBe('Progresso')
    w.unmount()
    setRoute('/configuracoes')
    w = await mountSuspended(TopNav)
    expect(w.find('a[aria-current="page"]').exists()).toBe(false)
  })
})

describe('ShellBottomNav', () => {
  it('4 abas com rótulo, sem "Mais", ativo em /simulados = Praticar', async () => {
    setRoute('/simulados')
    const w = await mountSuspended(BottomNav, { attachTo: document.body })
    const nav = w.get('nav[aria-label="Navegação mobile"]')
    expect(nav.findAll('a').map(a => a.text())).toEqual(['Hoje', 'Cadernos', 'Praticar', 'Progresso'])
    expect(nav.text()).not.toContain('Mais')
    expect(nav.find('button').exists()).toBe(false)
    expect(nav.get('a[aria-current="page"]').text()).toBe('Praticar')
    expect(await axeViolations(w.element)).toEqual([])
  })
})

describe('ShellAccountMenu', () => {
  it('nome e e-mail, plano, itens do RF-3 com âncoras; Aparência troca o tema; sem violação de axe', async () => {
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    const trigger = w.get('button[aria-haspopup="menu"]')
    expect(trigger.attributes('aria-label')).toBe('Menu da conta')
    expect(trigger.text()).toBe('RA')
    await trigger.trigger('click')
    await tick()
    const panel = w.get('[data-menu-panel]')
    expect(panel.text()).toContain('Rafael Andrade')
    expect(panel.text()).toContain('rafael@exemplo.com')
    const items = w.findAll('[role^="menuitem"]')
    expect(items.map(i => i.text())).toEqual([
      'Plano IntensivoGerenciar', 'Conta e segurança', 'Estudo e lembretes', 'Uso de IA no mês',
      'Sistema', 'Claro', 'Escuro', 'Exportar meus dados', 'Ajuda e atalhos?', 'Sair',
    ])
    expect(items[1]!.attributes('href')).toBe('/configuracoes#conta')
    expect(items[7]!.attributes('href')).toBe('/configuracoes#dados')
    expect(w.get('[role="group"]').findAll('[role="menuitemradio"]').map(r => r.attributes('aria-checked'))).toEqual(['true', 'false', 'false'])
    expect(await axeViolations(w.element)).toEqual([])
    await items[6]!.trigger('click')
    expect(useColorMode().preference.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    useColorMode().set('system')
  })

  it('mensal com subscription_renews_at: "Intensivo · renova em" no item do plano, com o nome do catálogo', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@b.c', plan: 'pro', subscription_renews_at: '2026-11-28T12:00:00-03:00' } as any
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    await tick()
    expect(w.findAll('[role="menuitem"]')[0]!.text()).toContain('Intensivo · renova em 28/11')
    // The name follows the catalog (the API may still say "Pro")
    useState('plans').value = { plans: [{ key: 'pro', name: 'Pro' }], features: {} }
    await tick()
    expect(w.findAll('[role="menuitem"]')[0]!.text()).toContain('Pro · renova em 28/11')
    useState('plans').value = null
  })

  it('no teste: "Intensivo grátis até dd/mm", e no último dia "acaba hoje" (prd-planos-lancamento RF-F1)', async () => {
    const endsAt = new Date(Date.now() + 9 * 86_400_000).toISOString()
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@b.c', plan: 'free', trial: { status: 'active', started_at: null, ends_at: endsAt } } as any
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    await tick()
    const plan = w.findAll('[role="menuitem"]')[0]!
    expect(plan.text()).toContain(`Intensivo grátis até ${formatBillingDayMonth(endsAt)}`)
    expect(plan.attributes('href')).toBe('/planos')
    useAuthStore().user!.trial!.ends_at = new Date().toISOString()
    await tick()
    expect(w.findAll('[role="menuitem"]')[0]!.text()).toContain('Seu Intensivo grátis acaba hoje')
  })

  it('Free: o plano leva a /planos', async () => {
    useAuthStore().user = { id: 'u1', name: 'Ana', email: 'a@b.c', plan: 'free' } as any
    const w = await mountSuspended(AccountMenu, { attachTo: document.body })
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    await tick()
    const plan = w.findAll('[role="menuitem"]')[0]!
    expect(plan.text()).toContain('Plano Grátis')
    expect(plan.attributes('href')).toBe('/planos')
  })
})

describe('ShellAddSheet', () => {
  async function openSheet() {
    const w = await mountSuspended(AddSheet, { attachTo: document.body })
    useAddSheet().open.value = true
    await tick()
    return w
  }

  it('grava no caderno aberto: "Colar texto" vira nota em /topics/{rota}/notes', async () => {
    setRoute('/cadernos', { topic: 't1a' })
    apiMock.mockImplementation(async (url: string) => (url === '/topics' ? { data: structuredClone(TREE) } : { data: { id: 'n1' } }))
    await openSheet()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.textContent).toContain('Grava em Direito Constitucional')
    const select = dialog.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('t1a')
    const rows = [...dialog.querySelectorAll('ul[aria-label="O que adicionar"] button .font-medium')].map(b => b.textContent?.trim())
    expect(rows).toEqual(['PDF', 'Colar texto', 'Questão que errei', 'Foto', 'Nota em branco', 'Importar do Anki'])
    expect(await axeViolations(dialog)).toEqual([])
    ;(dialog.querySelectorAll('ul[aria-label="O que adicionar"] button')[1] as HTMLButtonElement).click()
    await tick()
    const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'Controle difuso\nQualquer juiz declara no caso concreto.'
    textarea.dispatchEvent(new Event('input'))
    await tick()
    ;(dialog.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'))
    await tick()
    expect(apiMock).toHaveBeenCalledWith('/topics/t1a/notes', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ title: 'Controle difuso' }),
    }))
    expect(localStorage.getItem('baigi-add-last-topic')).toBe('t1a')
    expect(useAddSheet().open.value).toBe(false)
  })

  it('fora de um caderno usa o último usado; "Nota em branco" entrega a intenção ao caderno', async () => {
    localStorage.setItem('baigi-add-last-topic', 't2')
    await openSheet()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect((dialog.querySelector('select') as HTMLSelectElement).value).toBe('t2')
    ;(dialog.querySelectorAll('ul[aria-label="O que adicionar"] button')[4] as HTMLButtonElement).click()
    await tick()
    expect(useAddIntent().value).toEqual({ kind: 'note', topicId: 't2' })
    expect(navigateToMock).toHaveBeenCalledWith('/cadernos/t2')
    useAddIntent().value = null
  })

  it('"Questão que errei" passa o escopo escolhido para a folha da questão (prd-questao-errada RF-F3)', async () => {
    setRoute('/cadernos', { topic: 't1a' })
    await openSheet()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    ;(dialog.querySelectorAll('ul[aria-label="O que adicionar"] button')[2] as HTMLButtonElement).click()
    await tick()
    expect(useAddSheet().open.value).toBe(false)
    expect(usePasteQuestion().open.value).toBe(true)
    expect(usePasteQuestion().topicId.value).toBe('t1a')
    expect(trackMock).toHaveBeenCalledWith('question_paste_opened', { origin: 'add' })
    expect(localStorage.getItem('baigi-add-last-topic')).toBe('t1a')
    usePasteQuestion().open.value = false
  })

  it('Alt+N (preset note) abre direto na nota em branco do escopo', async () => {
    setRoute('/revisar', { topic_id: 't1' })
    await mountSuspended(AddSheet, { attachTo: document.body })
    useAddSheet().show('shortcut', 'note')
    await tick()
    expect(useAddIntent().value).toEqual({ kind: 'note', topicId: 't1' })
    expect(trackMock).toHaveBeenCalledWith('add_opened', { origin: 'shortcut' })
    useAddIntent().value = null
  })
})

describe('ShellCommandPalette', () => {
  it('pontuação e grupos: exato > começo > contém; "Perguntar" sempre por último', () => {
    expect(scoreMatch('Inglês B2', 'inglês b2')).toBe(100)
    expect(scoreMatch('Inglês B2', 'ing')).toBe(80)
    expect(scoreMatch('Direito Constitucional', 'const')).toBe(60)
    expect(scoreMatch('Direito Constitucional', 'xyz')).toBe(0)
    const item = (id: string, label: string, category: CommandItem['category']): CommandItem => ({ id, label, category, icon: {} as any, keywords: [], handler: () => {} })
    const groups = groupResults([item('a', 'Perguntar', 'ask'), item('b', 'Inglês B2', 'notebooks'), item('c', 'Hoje', 'pages')], 'ing')
    expect(groups.map(g => g.category)).toEqual(['notebooks', 'ask'])
  })

  it('de qualquer tela: carrega a árvore ao abrir e acha um caderno; combobox sem violação de axe', async () => {
    useTopicStore().tree = []
    apiMock.mockImplementation(async (url: string) => {
      if (url === '/topics') return { data: structuredClone(TREE) }
      return { data: [] }
    })
    setRoute('/progresso')
    useCommandPaletteOpen().value = true
    const w = await mountSuspended(CommandPalette, { attachTo: document.body })
    await tick()
    expect(apiMock).toHaveBeenCalledWith('/topics')
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const input = dialog.querySelector('input[role="combobox"]') as HTMLInputElement
    expect(input.getAttribute('aria-controls')).toBe(dialog.querySelector('[role="listbox"]')!.id)
    input.value = 'ingl'
    input.dispatchEvent(new Event('input'))
    await tick()
    const options = [...dialog.querySelectorAll('[role="option"]')]
    expect(options[0]!.textContent).toContain('Inglês B2')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0]!.id)
    expect(options.at(-1)!.textContent).toContain('Perguntar: “ingl”')
    expect(await axeViolations(dialog)).toEqual([])
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await tick()
    expect(navigateToMock).toHaveBeenCalledWith('/cadernos/t2')
    expect(useCommandPaletteOpen().value).toBe(false)
    w.unmount()
  })

  it('"Perguntar…" abre o tira-dúvidas com a pergunta pronta e o caderno da rota (05/#6)', async () => {
    apiMock.mockResolvedValue({ data: [] })
    setRoute('/cadernos', { topic: 't1' })
    useCommandPaletteOpen().value = true
    await mountSuspended(CommandPalette, { attachTo: document.body })
    await tick()
    const input = document.querySelector('input[role="combobox"]') as HTMLInputElement
    input.value = 'o que é controle difuso'
    input.dispatchEvent(new Event('input'))
    await tick()
    const ask = [...document.querySelectorAll('[role="option"]')].at(-1) as HTMLElement
    ask.click()
    await tick()
    const chat = useChatStore()
    expect(chat.isOpen).toBe(true)
    expect(chat.draft).toBe('o que é controle difuso')
    expect(chat.currentContext).toEqual({ topicId: 't1', source: 'search' })
    chat.close()
  })
})

describe('ShellMiniPlayer', () => {
  it('só aparece com podcast; pausa, expande e fecha com evento', async () => {
    const player = usePlayerStore()
    player.currentPodcast = null
    const w = await mountSuspended(MiniPlayer, { attachTo: document.body })
    expect(w.find('[role="region"]').exists()).toBe(false)
    player.currentPodcast = { id: 'p1', title: 'Seus erros de ontem', status: 'ready', created_at: '' } as any
    player.isPlaying = true
    player.currentTime = 275
    player.duration = 724
    await nextTick()
    const region = w.get('[role="region"][aria-label="Tocando agora"]')
    expect(region.text()).toContain('Seus erros de ontem')
    expect(region.text()).toContain('4:35 de 12:04')
    const toggle = vi.spyOn(player, 'togglePlay').mockImplementation(() => {})
    await w.get('button[aria-label="Pausar"]').trigger('click')
    expect(toggle).toHaveBeenCalled()
    expect(trackMock).toHaveBeenCalledWith('miniplayer_toggled', { action: 'pause' })
    await w.get('button[aria-label="Expandir player"]').trigger('click')
    expect(player.expanded).toBe(true)
    const stop = vi.spyOn(player, 'stop').mockImplementation(() => {})
    await w.get('button[aria-label="Fechar player"]').trigger('click')
    expect(stop).toHaveBeenCalled()
    expect(await axeViolations(region.element)).toEqual([])
    player.currentPodcast = null
  })

  it('episódio terminado: "Revisar os N do episódio" com scope=podcast: (F2 RF-F5)', async () => {
    const player = usePlayerStore()
    const w = await mountSuspended(MiniPlayer, { attachTo: document.body })
    player.currentPodcast = { id: 'p1', title: 'Erros', status: 'ready', created_at: '', card_ids: ['a', 'b', 'c', 'd', 'e'], cards_available: 4 } as any
    player.isPlaying = true
    player.currentTime = 100
    player.duration = 724
    await nextTick()
    expect(w.text()).not.toContain('do episódio')
    player.isPlaying = false
    player.currentTime = 724
    await nextTick()
    const link = w.findAll('a').find(a => a.text() === 'Revisar os 4 do episódio')
    expect(link?.attributes('href')).toBe('/revisar?scope=podcast:p1')
    player.currentPodcast = null
  })
})
