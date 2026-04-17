<template>
  <div class="flex flex-col h-[calc(100vh-4rem)] lg:h-screen relative">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
      <h1 class="text-headline">Mapa de Conhecimento</h1>
      <div class="flex items-center gap-2">
        <button
          v-if="!connectMode"
          class="btn-secondary text-micro"
          :disabled="!graphStore.data?.nodes.length"
          @click="startConnectMode"
        >
          <Link2 :size="16" /> Conectar
        </button>
        <button v-else class="btn-danger text-micro" @click="cancelConnectMode">
          <X :size="16" /> Cancelar
        </button>
      </div>
    </div>

    <!-- Connect mode banner -->
    <div v-if="connectMode" class="px-4 py-2 bg-accent-primary-subtle text-accent-primary text-small text-center shrink-0">
      {{ connectSource ? 'Clique no segundo tópico para conectar' : 'Clique no primeiro tópico' }}
      <span v-if="connectSource" class="font-medium"> — {{ connectSourceName }}</span>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Graph -->
      <div v-if="graphStore.loading" class="flex-1 flex items-center justify-center">
        <div class="skeleton h-64 w-64 rounded-full" />
      </div>

      <div v-else-if="!graphStore.data?.nodes.length" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <Network :size="48" class="text-base-muted mb-4" />
        <p class="text-title text-base-secondary">Nenhum tópico ainda</p>
        <p class="text-small text-base-muted mt-1">Crie tópicos para ver seu mapa de conhecimento.</p>
        <NuxtLink to="/topics" class="btn-primary mt-6">Criar tópicos</NuxtLink>
      </div>

      <div v-else ref="containerRef" class="flex-1 relative overflow-hidden" />

      <!-- Node detail panel -->
      <aside
        v-if="graphStore.selectedNode"
        class="w-80 border-l border-base bg-surface-secondary flex flex-col overflow-y-auto shrink-0"
      >
        <div class="p-4 border-b border-base">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-title truncate">{{ graphStore.selectedNode.name }}</h2>
            <button class="p-1 rounded hover:bg-surface-tertiary" @click="graphStore.clearSelection()">
              <X :size="16" class="text-base-muted" />
            </button>
          </div>

          <!-- Progress bar -->
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-2 rounded-full bg-surface-tertiary">
              <div
                class="h-2 rounded-full transition-all"
                :class="progressBarColor(graphStore.selectedNode.progress)"
                :style="{ width: Math.round(graphStore.selectedNode.progress * 100) + '%' }"
              />
            </div>
            <span class="text-micro text-base-muted">{{ Math.round(graphStore.selectedNode.progress * 100) }}%</span>
          </div>

          <div class="flex gap-4 text-micro text-base-muted">
            <span>{{ graphStore.selectedNode.flashcards_count }} cards</span>
            <span>{{ graphStore.selectedNode.notes_count }} notas</span>
            <span>{{ graphStore.selectedNode.review_count }} dominados</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="p-4 border-b border-base flex flex-col gap-2">
          <NuxtLink :to="`/review?topic_id=${graphStore.selectedNode.id}`" class="btn-primary text-small justify-center">
            <BookOpen :size="16" /> Revisar este tópico
          </NuxtLink>
          <NuxtLink :to="`/topics?topic=${graphStore.selectedNode.id}`" class="btn-secondary text-small justify-center">
            <FolderTree :size="16" /> Ver tópico
          </NuxtLink>
        </div>

        <!-- Goal -->
        <div v-if="graphStore.selectedNode.goal" class="px-4 py-3 border-b border-base bg-accent-primary-subtle">
          <p class="text-micro text-accent-primary font-medium">🎯 Meta</p>
          <p class="text-small text-base-primary mt-1">
            Dominar até {{ formatDate(graphStore.selectedNode.goal.target_date) }}
          </p>
          <p class="text-micro text-base-muted">
            {{ graphStore.selectedNode.goal.cards_per_day }} cards/dia · {{ graphStore.selectedNode.goal.remaining }} restantes · {{ graphStore.selectedNode.goal.days_left }} dias
          </p>
        </div>

        <!-- Cards -->
        <div v-if="graphStore.selectedNode.flashcards.length" class="p-4 border-b border-base">
          <p class="text-label mb-2">Cards</p>
          <div class="space-y-1">
            <NuxtLink
              v-for="card in graphStore.selectedNode.flashcards.slice(0, 8)"
              :key="card.id"
              :to="`/decks?card=${card.id}`"
              class="flex items-center gap-2 text-small px-2 py-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :class="stateColor(card.state)"
              />
              <span class="truncate text-base-secondary flex-1">{{ stripHtml(card.front) }}</span>
              <span class="text-micro text-base-muted shrink-0">{{ stateLabel(card.state) }}</span>
            </NuxtLink>
            <p v-if="graphStore.selectedNode.flashcards.length > 8" class="text-micro text-base-muted px-2">
              +{{ graphStore.selectedNode.flashcards.length - 8 }} cards
            </p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="graphStore.selectedNode.notes.length" class="p-4">
          <p class="text-label mb-2">Notas</p>
          <div class="space-y-1">
            <NuxtLink
              v-for="note in graphStore.selectedNode.notes"
              :key="note.id"
              :to="`/topics?topic=${graphStore.selectedNode.id}&note=${note.id}`"
              class="flex items-center gap-2 text-small px-2 py-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-base-secondary"
            >
              📝 {{ note.title }}
            </NuxtLink>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!graphStore.selectedNode.flashcards.length && !graphStore.selectedNode.notes.length" class="p-4 text-center">
          <p class="text-small text-base-muted">Nenhum card ou nota neste tópico.</p>
        </div>
      </aside>
    </div>

    <!-- Legend -->
    <div v-if="graphStore.data?.nodes.length" class="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-surface-secondary/90 backdrop-blur text-micro text-base-muted border border-base">
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-[#6B7280] inline-block" /> Sem cards</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-danger inline-block" /> &lt; 30%</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-warning inline-block" /> 30-70%</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-success inline-block" /> &gt; 70%</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full border-2 border-dashed border-danger inline-block" /> Conexão fraca</span>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="absolute z-50 bg-surface-secondary border border-base rounded-lg shadow-lg py-1 min-w-[160px]"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button class="w-full text-left px-3 py-2 text-small hover:bg-surface-tertiary transition-colors" @click="goToTopic">
        Ver tópico
      </button>
      <button class="w-full text-left px-3 py-2 text-small hover:bg-surface-tertiary transition-colors" @click="startConnectFrom">
        Conectar com...
      </button>
      <template v-if="contextMenuConnections.length">
        <div class="border-t border-base my-1" />
        <button
          v-for="conn in contextMenuConnections"
          :key="conn.id"
          class="w-full text-left px-3 py-2 text-micro text-danger hover:bg-surface-tertiary transition-colors"
          @click="removeConnection(conn.id!)"
        >
          Desconectar de {{ conn.targetName }}
        </button>
      </template>
    </div>

    <!-- Connect label modal -->
    <UiModal v-model="showLabelModal" size="sm">
      <h2 class="text-headline mb-4">Conectar tópicos</h2>
      <p class="text-small text-base-secondary mb-3">
        {{ connectSourceName }} ↔ {{ connectTargetName }}
      </p>
      <input
        v-model="connectLabel"
        class="input-base"
        placeholder="Label (opcional) — ex: pré-requisito"
        @keydown.enter="confirmConnection"
      />
      <div class="flex gap-3 justify-end mt-4">
        <button class="btn-secondary" @click="cancelLabel">Cancelar</button>
        <button class="btn-primary" @click="confirmConnection">Conectar</button>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Link2, X, Network, BookOpen, FolderTree } from 'lucide-vue-next'

const graphStore = useGraphStore()
const toast = useToast()
const router = useRouter()

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '') ?? ''
}

const containerRef = ref<HTMLElement | null>(null)

// Connect mode
const connectMode = ref(false)
const connectSource = ref<string | null>(null)
const connectTarget = ref<string | null>(null)
const connectLabel = ref('')
const showLabelModal = ref(false)

const connectSourceName = computed(() =>
  graphStore.data?.nodes.find(n => n.id === connectSource.value)?.name ?? '',
)
const connectTargetName = computed(() =>
  graphStore.data?.nodes.find(n => n.id === connectTarget.value)?.name ?? '',
)

// Context menu
const contextMenu = reactive({ visible: false, x: 0, y: 0, nodeId: '' })
const contextMenuConnections = computed(() => {
  if (!contextMenu.nodeId || !graphStore.data) return []
  return graphStore.data.edges
    .filter(e => e.type === 'connection' && (e.source === contextMenu.nodeId || e.target === contextMenu.nodeId))
    .map(e => {
      const otherId = e.source === contextMenu.nodeId ? e.target : e.source
      const other = graphStore.data!.nodes.find(n => n.id === otherId)
      return { id: e.id, targetName: other?.name ?? '?' }
    })
})

// Graph
const graphNodes = computed(() => graphStore.data?.nodes ?? [])
const graphEdges = computed(() => graphStore.data?.edges ?? [])

const { render, destroy } = useGraph(containerRef, graphNodes, graphEdges, {
  onNodeClick(id) {
    if (connectMode.value) {
      handleConnectClick(id)
    } else {
      graphStore.fetchNodeDetails(id)
    }
  },
  onNodeRightClick(id, event) {
    if (connectMode.value) return
    contextMenu.visible = true
    contextMenu.x = event.offsetX
    contextMenu.y = event.offsetY
    contextMenu.nodeId = id
  },
})

function handleConnectClick(id: string) {
  if (!connectSource.value) {
    connectSource.value = id
  } else if (id !== connectSource.value) {
    connectTarget.value = id
    showLabelModal.value = true
  }
}

async function confirmConnection() {
  if (!connectSource.value || !connectTarget.value) return
  try {
    await graphStore.createConnection(connectSource.value, connectTarget.value, connectLabel.value || undefined)
    toast.show('Conexão criada!', 'success')
  } catch {
    toast.show('Erro ao criar conexão.', 'error')
  }
  resetConnectMode()
  await nextTick()
  render()
}

function startConnectMode() {
  contextMenu.visible = false
  connectMode.value = true
  connectSource.value = null
  connectTarget.value = null
}

function startConnectFrom() {
  connectMode.value = true
  connectSource.value = contextMenu.nodeId
  contextMenu.visible = false
}

function cancelConnectMode() {
  resetConnectMode()
}

function cancelLabel() {
  showLabelModal.value = false
  resetConnectMode()
}

function resetConnectMode() {
  connectMode.value = false
  connectSource.value = null
  connectTarget.value = null
  connectLabel.value = ''
  showLabelModal.value = false
}

function goToTopic() {
  router.push(`/topics?topic=${contextMenu.nodeId}`)
  contextMenu.visible = false
}

async function removeConnection(id: string) {
  try {
    await graphStore.deleteConnection(id)
    toast.show('Conexão removida.', 'success')
    contextMenu.visible = false
    await nextTick()
    render()
  } catch {
    toast.show('Erro ao remover conexão.', 'error')
  }
}

function progressBarColor(progress: number): string {
  if (progress < 0.3) return 'bg-danger'
  if (progress < 0.7) return 'bg-warning'
  return 'bg-success'
}

function stateColor(state: string): string {
  if (state === 'review') return 'bg-success'
  if (state === 'learning' || state === 'relearning') return 'bg-warning'
  return 'bg-[#6B7280]'
}

function stateLabel(state: string): string {
  if (state === 'review') return 'Dominado'
  if (state === 'learning') return 'Aprendendo'
  if (state === 'relearning') return 'Reaprendendo'
  return 'Novo'
}

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Close context menu on click outside
function onDocClick() {
  contextMenu.visible = false
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  await graphStore.fetchGraph()
  await nextTick()
  render()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  destroy()
})

watch(() => graphStore.data, async () => {
  await nextTick()
  render()
})
</script>
