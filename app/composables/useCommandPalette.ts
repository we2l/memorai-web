import {
  BookOpen,
  FileText,
  Home,
  RotateCcw,
  Headphones,
  BarChart3,
  Settings,
  Network,
  MessageCircle,
  Download,
  CreditCard,
  Zap,
  Plus,
  StickyNote,
  Palette,
  type LucideIcon,
} from 'lucide-vue-next'

export interface CommandItem {
  id: string
  label: string
  category: 'pages' | 'notebooks' | 'notes' | 'actions'
  icon: LucideIcon
  keywords: string[]
  meta?: string
  handler: () => void | Promise<void>
}

export interface CommandGroup {
  category: string
  label: string
  items: CommandItem[]
}

const CATEGORY_LABELS: Record<string, string> = {
  pages: 'Páginas',
  notebooks: 'Cadernos',
  notes: 'Notas',
  actions: 'Ações',
}

const MAX_RESULTS_PER_CATEGORY = 4
const MAX_TOTAL_RESULTS = 12

export function useCommandPalette() {
  const isOpen = ref(false)
  const query = ref('')
  const selectedIndex = ref(0)

  const router = useRouter()
  const auth = useAuthStore()
  const topicStore = useTopicStore()
  const { toggle: toggleTheme } = useColorMode()

  function open() {
    if (!auth.isAuthenticated) return
    isOpen.value = true
    query.value = ''
    selectedIndex.value = 0
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value ? close() : open()
  }

  // Static pages
  const pages: CommandItem[] = [
    { id: 'page-hoje', label: 'Hoje', category: 'pages', icon: Home, keywords: ['hoje', 'home', 'dashboard', 'início'], handler: () => navigateTo('/hoje') },
    { id: 'page-cadernos', label: 'Cadernos', category: 'pages', icon: BookOpen, keywords: ['cadernos', 'notebooks', 'tópicos', 'matérias'], handler: () => navigateTo('/cadernos') },
    { id: 'page-revisar', label: 'Revisão', category: 'pages', icon: RotateCcw, keywords: ['revisão', 'revisar', 'review', 'cards', 'flashcards'], meta: 'Alt+R', handler: () => navigateTo('/revisar') },
    { id: 'page-podcasts', label: 'Podcasts', category: 'pages', icon: Headphones, keywords: ['podcasts', 'áudio', 'ouvir'], handler: () => navigateTo('/podcasts') },
    { id: 'page-progresso', label: 'Progresso', category: 'pages', icon: BarChart3, keywords: ['progresso', 'estatísticas', 'stats', 'desempenho'], handler: () => navigateTo('/progresso') },
    { id: 'page-grafo', label: 'Grafo', category: 'pages', icon: Network, keywords: ['grafo', 'graph', 'mapa', 'conexões'], handler: () => navigateTo('/grafo') },
    { id: 'page-chat', label: 'Chat IA', category: 'pages', icon: MessageCircle, keywords: ['chat', 'ia', 'agente', 'perguntar', 'assistente'], handler: () => navigateTo('/chat') },
    { id: 'page-importar', label: 'Importar Anki', category: 'pages', icon: Download, keywords: ['importar', 'anki', 'apkg'], handler: () => navigateTo('/importar') },
    { id: 'page-configuracoes', label: 'Configurações', category: 'pages', icon: Settings, keywords: ['configurações', 'settings', 'preferências'], handler: () => navigateTo('/configuracoes') },
    { id: 'page-planos', label: 'Planos', category: 'pages', icon: CreditCard, keywords: ['planos', 'pro', 'assinatura', 'upgrade', 'pricing'], handler: () => navigateTo('/planos') },
  ]

  // Static actions
  const actions: CommandItem[] = [
    { id: 'action-revisar', label: 'Revisar agora', category: 'actions', icon: RotateCcw, keywords: ['revisar', 'review', 'começar'], meta: 'Alt+R', handler: () => navigateTo('/revisar') },
    { id: 'action-novo-caderno', label: 'Novo caderno', category: 'actions', icon: Plus, keywords: ['novo', 'caderno', 'criar', 'notebook'], handler: () => navigateTo('/cadernos?action=new-notebook') },
    { id: 'action-nova-nota', label: 'Nova nota', category: 'actions', icon: StickyNote, keywords: ['nova', 'nota', 'criar', 'escrever'], meta: 'Alt+N', handler: () => navigateTo('/cadernos?action=new-note') },
    { id: 'action-gerar-cards', label: 'Gerar cards com IA', category: 'actions', icon: Zap, keywords: ['gerar', 'cards', 'ia', 'flashcards', 'inteligência'], handler: () => navigateTo('/cadernos?action=generate-cards') },
    { id: 'action-importar', label: 'Importar Anki', category: 'actions', icon: Download, keywords: ['importar', 'anki', 'apkg', 'upload'], handler: () => navigateTo('/importar') },
    { id: 'action-podcast', label: 'Gerar podcast', category: 'actions', icon: Headphones, keywords: ['podcast', 'gerar', 'áudio', 'ouvir'], handler: () => navigateTo('/podcasts?action=generate') },
    { id: 'action-tema', label: 'Alternar tema', category: 'actions', icon: Palette, keywords: ['tema', 'dark', 'light', 'escuro', 'claro', 'modo'], handler: () => { toggleTheme(); close() } },
  ]

  // Dynamic: notebooks from store
  const notebookItems = computed<CommandItem[]>(() => {
    return flattenTopics(topicStore.tree).map((topic) => ({
      id: `notebook-${topic.id}`,
      label: topic.name,
      category: 'notebooks' as const,
      icon: BookOpen,
      keywords: [topic.name.toLowerCase()],
      meta: topic.parent_id ? 'sub-caderno' : undefined,
      handler: () => navigateTo(`/cadernos?topic=${topic.id}`),
    }))
  })

  // Flatten topic tree recursively
  function flattenTopics(topics: any[]): any[] {
    const result: any[] = []
    for (const topic of topics) {
      result.push(topic)
      if (topic.children?.length) {
        result.push(...flattenTopics(topic.children))
      }
    }
    return result
  }

  // Fuzzy search scoring
  function scoreMatch(text: string, q: string): number {
    const lower = text.toLowerCase()
    const qLower = q.toLowerCase()
    if (lower === qLower) return 100
    if (lower.startsWith(qLower)) return 80
    if (lower.includes(qLower)) return 60

    // Split query words and check each
    const words = qLower.split(/\s+/)
    const allMatch = words.every((w) => lower.includes(w))
    if (allMatch) return 40

    return 0
  }

  function matchItem(item: CommandItem, q: string): number {
    const labelScore = scoreMatch(item.label, q)
    const keywordScore = Math.max(...item.keywords.map((k) => scoreMatch(k, q)), 0)
    return Math.max(labelScore, keywordScore * 0.9)
  }

  // Computed results
  const results = computed<CommandGroup[]>(() => {
    const q = query.value.trim()

    if (!q) {
      // Default: show pages + actions
      return [
        { category: 'pages', label: CATEGORY_LABELS.pages, items: pages.slice(0, 5) },
        { category: 'actions', label: CATEGORY_LABELS.actions, items: actions.slice(0, 4) },
      ]
    }

    const allItems = [...pages, ...notebookItems.value, ...actions]
    const scored = allItems
      .map((item) => ({ item, score: matchItem(item, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)

    // Group by category, respecting limits
    const grouped: Record<string, CommandItem[]> = {}
    let total = 0

    for (const { item } of scored) {
      if (total >= MAX_TOTAL_RESULTS) break
      if (!grouped[item.category]) grouped[item.category] = []
      if (grouped[item.category].length >= MAX_RESULTS_PER_CATEGORY) continue
      grouped[item.category].push(item)
      total++
    }

    // Build groups in display order
    const order: Array<'pages' | 'notebooks' | 'notes' | 'actions'> = ['pages', 'notebooks', 'notes', 'actions']
    return order
      .filter((cat) => grouped[cat]?.length)
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        items: grouped[cat],
      }))
  })

  // Flat list for keyboard navigation
  const flatResults = computed<CommandItem[]>(() => {
    return results.value.flatMap((g) => g.items)
  })

  // Keyboard navigation
  function moveUp() {
    if (flatResults.value.length === 0) return
    selectedIndex.value = selectedIndex.value <= 0
      ? flatResults.value.length - 1
      : selectedIndex.value - 1
  }

  function moveDown() {
    if (flatResults.value.length === 0) return
    selectedIndex.value = selectedIndex.value >= flatResults.value.length - 1
      ? 0
      : selectedIndex.value + 1
  }

  function executeSelected() {
    const item = flatResults.value[selectedIndex.value]
    if (item) executeItem(item)
  }

  function executeItem(item: CommandItem) {
    item.handler()
    close()
  }

  // Reset selected index when results change
  watch(query, () => {
    selectedIndex.value = 0
  })

  // Global keyboard shortcuts
  function handleGlobalKeydown(e: KeyboardEvent) {
    if (!auth.isAuthenticated) return

    // Don't fire when typing in input/textarea/contenteditable
    const target = e.target as HTMLElement
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Ctrl+K / ⌘K — always capture (even in inputs)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      toggle()
      return
    }

    // Don't fire other shortcuts when in editable fields
    if (isEditable) return

    // Alt+R — go to review
    if (e.altKey && e.key === 'r') {
      e.preventDefault()
      navigateTo('/revisar')
      return
    }

    // Alt+N — new note
    if (e.altKey && e.key === 'n') {
      e.preventDefault()
      navigateTo('/cadernos?action=new-note')
      return
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      document.addEventListener('keydown', handleGlobalKeydown)
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      document.removeEventListener('keydown', handleGlobalKeydown)
    }
  })

  return {
    isOpen,
    query,
    selectedIndex,
    results,
    flatResults,
    open,
    close,
    toggle,
    moveUp,
    moveDown,
    executeSelected,
    executeItem,
  }
}
