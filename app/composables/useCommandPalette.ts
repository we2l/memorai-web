import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CircleHelp,
  CreditCard,
  Download,
  Dumbbell,
  FileText,
  FolderOpen,
  Headphones,
  HelpCircle,
  Home,
  Layers,
  MessageCircle,
  Palette,
  Plus,
  RotateCcw,
  Settings,
  StickyNote,
  type LucideIcon,
} from 'lucide-vue-next'
import type { Flashcard, Topic } from '~/types'

/**
 * Global search of the shell (prd-navegacao-v3 RF-6): pages, cadernos and matérias (the tree, loaded when
 * the palette opens, from any screen), materiais (notes of the cadernos, loaded on the first query) and
 * cards (GET /topics/{caderno}/flashcards?q=, subtree), plus actions and "Perguntar…" to the tira-dúvidas.
 */
export type CommandCategory = 'pages' | 'notebooks' | 'notes' | 'cards' | 'actions' | 'ask'

export interface CommandItem {
  id: string
  label: string
  category: CommandCategory
  icon: LucideIcon
  keywords: string[]
  meta?: string
  handler: () => void | Promise<void>
}

export interface CommandGroup {
  category: CommandCategory
  label: string
  items: CommandItem[]
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  pages: 'Ir para',
  notebooks: 'Cadernos e assuntos',
  notes: 'Materiais',
  cards: 'Cards',
  actions: 'Ações',
  ask: 'Tira-dúvidas',
}
const ORDER: CommandCategory[] = ['notebooks', 'notes', 'cards', 'actions', 'pages', 'ask']

const MAX_PER_CATEGORY = 4
/** Notes are fetched per topic (GET /topics/{id}/notes has no subtree): at most this many topics */
const MAX_NOTE_TOPICS = 24
/** Cards are searched per caderno (subtree on the API side): at most this many cadernos */
const MAX_CARD_ROOTS = 5
const CARD_DEBOUNCE_MS = 250

/** Open state shared by the shortcuts plugin, the layout (lazy mount), the TopNav and the palette. */
export function useCommandPaletteOpen() {
  return useState('command-palette-open', () => false)
}

/** Ranks a text against the query: 0 = no match. */
export function scoreMatch(text: string, q: string): number {
  const lower = text.toLocaleLowerCase('pt-BR')
  const query = q.toLocaleLowerCase('pt-BR').trim()
  if (!query) return 0
  if (lower === query) return 100
  if (lower.startsWith(query)) return 80
  if (lower.includes(query)) return 60
  return query.split(/\s+/).every(w => lower.includes(w)) ? 40 : 0
}

function matchItem(item: CommandItem, q: string): number {
  const label = scoreMatch(item.label, q)
  const keyword = Math.max(0, ...item.keywords.map(k => scoreMatch(k, q)))
  return Math.max(label, keyword * 0.9)
}

/** Ranked groups in display order, at most MAX_PER_CATEGORY per group; `ask` always last. */
export function groupResults(items: CommandItem[], q: string): CommandGroup[] {
  const scored = items
    .map(item => ({ item, score: item.category === 'ask' ? 1 : matchItem(item, q) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
  const grouped: Partial<Record<CommandCategory, CommandItem[]>> = {}
  for (const { item } of scored) {
    const list = (grouped[item.category] ??= [])
    if (list.length < MAX_PER_CATEGORY) list.push(item)
  }
  return ORDER.filter(c => grouped[c]?.length).map(c => ({ category: c, label: CATEGORY_LABELS[c], items: grouped[c]! }))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function useCommandPalette() {
  const isOpen = useCommandPaletteOpen()
  const query = ref('')
  const selectedIndex = ref(0)

  const route = useRoute()
  const auth = useAuthStore()
  const topicStore = useTopicStore()
  const addSheet = useAddSheet()
  const { $api } = useNuxtApp()

  function close() {
    isOpen.value = false
  }

  function go(path: string) {
    return () => { void navigateTo(path) }
  }

  const pages: CommandItem[] = [
    { id: 'page-hoje', label: 'Hoje', category: 'pages', icon: Home, keywords: ['hoje', 'início', 'plano do dia'], handler: go('/hoje') },
    { id: 'page-cadernos', label: 'Cadernos', category: 'pages', icon: BookOpen, keywords: ['cadernos', 'assuntos', 'notas', 'materiais'], handler: go('/cadernos') },
    { id: 'page-praticar', label: 'Praticar', category: 'pages', icon: Dumbbell, keywords: ['praticar', 'treinar', 'exercícios'], handler: go('/praticar') },
    { id: 'page-progresso', label: 'Progresso', category: 'pages', icon: BarChart3, keywords: ['progresso', 'estatísticas', 'desempenho'], handler: go('/progresso') },
    { id: 'page-simulados', label: 'Questões e simulados', category: 'pages', icon: CircleHelp, keywords: ['simulados', 'questões', 'quiz', 'teste'], handler: go('/simulados') },
    { id: 'page-podcasts', label: 'Ouvir (podcasts)', category: 'pages', icon: Headphones, keywords: ['podcasts', 'ouvir', 'áudio', 'episódios'], handler: go('/podcasts') },
    { id: 'page-provas', label: 'Provas e agenda', category: 'pages', icon: CalendarClock, keywords: ['provas', 'agenda', 'calendário', 'concurso'], handler: go('/provas') },
    { id: 'page-configuracoes', label: 'Configurações', category: 'pages', icon: Settings, keywords: ['configurações', 'conta', 'preferências', 'lembretes'], handler: go('/configuracoes') },
    { id: 'page-ajuda', label: 'Ajuda e atalhos', category: 'pages', icon: HelpCircle, keywords: ['ajuda', 'atalhos', 'teclado', 'como funciona'], handler: go('/ajuda?tab=atalhos') },
    { id: 'page-planos', label: 'Planos', category: 'pages', icon: CreditCard, keywords: ['planos', 'pro', 'assinatura', 'preço'], handler: go('/planos') },
  ]

  const actions: CommandItem[] = [
    { id: 'action-revisar', label: 'Revisar hoje', category: 'actions', icon: RotateCcw, keywords: ['revisar', 'revisão', 'cards', 'começar'], meta: 'Alt+R', handler: go('/revisar') },
    { id: 'action-adicionar', label: 'Adicionar material', category: 'actions', icon: Plus, keywords: ['adicionar', 'pdf', 'foto', 'texto', 'importar', 'material'], handler: () => addSheet.show('search') },
    { id: 'action-nota', label: 'Nota em branco', category: 'actions', icon: StickyNote, keywords: ['nota', 'nova', 'anotar', 'escrever'], meta: 'Alt+N', handler: () => addSheet.show('search', 'note') },
    { id: 'action-caderno', label: 'Novo caderno', category: 'actions', icon: FolderOpen, keywords: ['novo', 'caderno', 'criar'], handler: go('/cadernos?action=new-notebook') },
    { id: 'action-simulado', label: 'Novo simulado', category: 'actions', icon: CircleHelp, keywords: ['simulado', 'questões', 'quiz', 'gerar'], handler: go('/simulados?action=new') },
    { id: 'action-prova', label: 'Nova prova', category: 'actions', icon: CalendarClock, keywords: ['prova', 'agendar', 'data', 'concurso'], handler: go('/provas?nova=1') },
    { id: 'action-podcast', label: 'Gerar episódio', category: 'actions', icon: Headphones, keywords: ['podcast', 'gerar', 'áudio', 'ouvir'], handler: go('/podcasts?action=generate') },
    { id: 'action-anki', label: 'Importar do Anki', category: 'actions', icon: Download, keywords: ['importar', 'anki', 'apkg'], handler: go('/importar') },
    { id: 'action-tema', label: 'Aparência (tema)', category: 'actions', icon: Palette, keywords: ['tema', 'escuro', 'claro', 'aparência', 'sistema'], handler: go('/configuracoes#aparencia') },
  ]

  /** Cadernos (roots) and matérias/assuntos (children), with the path as meta. */
  const topicItems = computed<CommandItem[]>(() => {
    const out: CommandItem[] = []
    const walk = (topics: Topic[], path: string[]) => {
      for (const t of topics) {
        out.push({
          id: `topic-${t.id}`,
          label: t.name,
          category: 'notebooks',
          icon: path.length ? FolderOpen : BookOpen,
          keywords: path,
          meta: path.length ? path.join(' › ') : 'caderno',
          handler: go(cadernoPath(t.id)),
        })
        if (t.children?.length) walk(t.children, [...path, t.name])
      }
    }
    walk(topicStore.tree, [])
    return out
  })

  // Materiais: notes of the tree, loaded once per opening (the list has no content since #124)
  const noteItems = ref<CommandItem[]>([])
  let notesLoaded = false
  async function loadNotes() {
    if (notesLoaded) return
    notesLoaded = true
    const topics = flattenTopics(topicStore.tree).slice(0, MAX_NOTE_TOPICS)
    const lists = await Promise.allSettled(topics.map(t => $api<{ data: { id: string, title: string }[] }>(`/topics/${t.id}/notes`)))
    const out: CommandItem[] = []
    lists.forEach((res, i) => {
      if (res.status !== 'fulfilled') return
      const topic = topics[i]!
      for (const note of res.value.data ?? []) {
        out.push({
          id: `note-${note.id}`,
          label: note.title || 'Sem título',
          category: 'notes',
          icon: FileText,
          keywords: [topic.name],
          meta: topic.name,
          handler: go(cadernoPath(topic.id, { note: note.id })),
        })
      }
    })
    noteItems.value = out
  }

  // Cards: the search of the Cards tab, per caderno (scope first), debounced
  const cardItems = ref<CommandItem[]>([])
  let cardTimer: ReturnType<typeof setTimeout> | null = null
  let cardRequest = 0
  function searchCards(q: string) {
    if (cardTimer) clearTimeout(cardTimer)
    cardItems.value = []
    if (q.trim().length < 3) return
    cardTimer = setTimeout(async () => {
      const id = ++cardRequest
      const scope = scopeTopicFromQuery(route.query)
      const rootOf = (topicId: string) => {
        let t = topicStore.findById(topicId)
        while (t?.parent_id) t = topicStore.findById(t.parent_id)
        return t?.id ?? topicId
      }
      const roots = [...new Set([...(scope ? [rootOf(scope)] : []), ...topicStore.tree.map(t => t.id)])].slice(0, MAX_CARD_ROOTS)
      const lists = await Promise.allSettled(roots.map(r => $api<{ data: Flashcard[] }>(`/topics/${r}/flashcards`, { params: { q: q.trim(), per_page: 3 } })))
      if (id !== cardRequest) return
      const out: CommandItem[] = []
      lists.forEach((res, i) => {
        if (res.status !== 'fulfilled') return
        const root = topicStore.findById(roots[i]!)
        for (const card of res.value.data ?? []) {
          const topicId = card.topic_id ?? roots[i]!
          out.push({
            id: `card-${card.id}`,
            label: stripHtml(card.front).slice(0, 90) || 'Card',
            category: 'cards',
            icon: Layers,
            // The API already matched front/back: the query is a keyword so the card ranks
            keywords: [q.trim()],
            meta: root?.name,
            handler: go(`/cadernos?topic=${encodeURIComponent(topicId)}&tab=cards&highlight=${encodeURIComponent(card.id)}`),
          })
        }
      })
      cardItems.value = out
    }, CARD_DEBOUNCE_MS)
  }

  const askItem = computed<CommandItem>(() => {
    const q = query.value.trim()
    return {
      id: 'ask',
      label: q ? `Perguntar: “${q}”` : 'Perguntar ao tira-dúvidas…',
      category: 'ask',
      icon: MessageCircle,
      keywords: [],
      handler: () => {
        const topicId = scopeTopicFromQuery(route.query) ?? undefined
        useChatStore().ask({ topicId, source: 'search' }, q)
      },
    }
  })

  const results = computed<CommandGroup[]>(() => {
    const q = query.value.trim()
    if (!q) {
      return [
        { category: 'actions', label: CATEGORY_LABELS.actions, items: actions.slice(0, 3) },
        { category: 'pages', label: CATEGORY_LABELS.pages, items: pages.slice(0, 4) },
        { category: 'ask', label: CATEGORY_LABELS.ask, items: [askItem.value] },
      ]
    }
    return groupResults([...topicItems.value, ...noteItems.value, ...cardItems.value, ...actions, ...pages, askItem.value], q)
  })

  const flatResults = computed(() => results.value.flatMap(g => g.items))

  function moveUp() {
    const n = flatResults.value.length
    if (n) selectedIndex.value = selectedIndex.value <= 0 ? n - 1 : selectedIndex.value - 1
  }

  function moveDown() {
    const n = flatResults.value.length
    if (n) selectedIndex.value = selectedIndex.value >= n - 1 ? 0 : selectedIndex.value + 1
  }

  function executeItem(item: CommandItem) {
    close()
    void item.handler()
  }

  function executeSelected() {
    const item = flatResults.value[selectedIndex.value]
    if (item) executeItem(item)
  }

  watch(query, (q) => {
    selectedIndex.value = 0
    if (q.trim().length >= 2) void loadNotes()
    searchCards(q)
  })

  // Opening from any screen loads the tree (it used to depend on visiting /cadernos)
  watch(isOpen, (open) => {
    if (!open) return
    query.value = ''
    selectedIndex.value = 0
    notesLoaded = false
    if (auth.isAuthenticated && !topicStore.tree.length && !topicStore.loading) {
      topicStore.fetchTree().catch((e: unknown) => reportApiError(e, { silent: true }))
    }
  }, { immediate: true })

  onBeforeUnmount(() => { if (cardTimer) clearTimeout(cardTimer) })

  return { isOpen, query, selectedIndex, results, flatResults, close, moveUp, moveDown, executeSelected, executeItem }
}
