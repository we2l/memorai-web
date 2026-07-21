<template>
  <div class="px-4 pt-4 pb-4 flex flex-col h-full min-h-[400px]">
    <!-- Controls -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <button
        class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small"
        :class="showOnlyWeak && 'bg-danger/10 text-danger border-danger/30'"
        :disabled="!graphStore.data?.nodes.length"
        @click="showOnlyWeak = !showOnlyWeak"
      >
        {{ showOnlyWeak ? '✕ Todos' : '🔴 Só fracos' }}
      </button>
      <button
        v-if="!connectMode"
        class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small"
        :disabled="!graphStore.data?.nodes.length"
        @click="startConnectMode"
      >
        <Link2 :size="14" /> Conectar
      </button>
      <button v-else class="btn-danger !py-1.5 !px-3 !min-h-0 text-small" @click="cancelConnectMode">
        <X :size="14" /> Cancelar
      </button>
      <button
        class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small ml-auto"
        title="Expandir"
        @click="$emit('expand')"
      >
        <Maximize2 :size="14" />
      </button>
    </div>

    <!-- Connect mode banner -->
    <div v-if="connectMode" class="px-3 py-2 mb-3 rounded-lg bg-accent-primary-subtle text-accent-primary text-small text-center">
      {{ connectSource ? 'Clique no segundo caderno' : 'Clique no primeiro caderno' }}
      <span v-if="connectSource" class="font-medium"> — {{ connectSourceName }}</span>
    </div>

    <!-- Graph -->
    <div v-if="graphStore.loading" class="flex-1 flex items-center justify-center">
      <div class="skeleton h-32 w-32 rounded-full" />
    </div>
    <div v-else-if="!graphStore.data?.nodes.length" class="flex-1 flex flex-col items-center justify-center gap-2">
      <p class="text-body text-base-secondary">Nenhum caderno com cards ainda</p>
      <p class="text-small text-base-muted">Crie cadernos e cards para ver seu mapa.</p>
    </div>
    <div v-else class="flex-1 relative overflow-hidden rounded-xl border border-base bg-[var(--bg-soft)]">
      <div ref="containerRef" class="absolute inset-0" />
      <!-- Recenter -->
      <button
        class="absolute bottom-3 right-3 p-2 rounded-lg bg-[var(--bg-card)] border border-base shadow text-base-muted hover:text-base-primary transition-colors"
        title="Recentralizar"
        @click="recenter"
      >
        <Maximize2 :size="16" />
      </button>
    </div>

    <!-- Node detail (below graph) -->
    <div v-if="graphStore.selectedNode" class="mt-3 p-3 rounded-xl bg-[var(--bg-card)] border border-base">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-body font-medium truncate">{{ graphStore.selectedNode.name }}</h3>
        <button class="p-1 rounded hover:bg-surface-secondary" @click="graphStore.clearSelection()">
          <X :size="14" class="text-base-muted" />
        </button>
      </div>
      <div class="flex items-center gap-2 mb-2">
        <div class="flex-1 h-1 rounded-full bg-surface-secondary">
          <div
            class="h-1 rounded-full bg-accent-primary-subtle0/65 transition-all"
            :style="{ width: Math.round(graphStore.selectedNode.progress * 100) + '%' }"
          />
        </div>
        <span class="text-micro text-base-muted">{{ Math.round(graphStore.selectedNode.progress * 100) }}%</span>
      </div>
      <div class="flex items-center gap-3 text-micro text-base-muted mb-3">
        <span>{{ graphStore.selectedNode.flashcards_count }} cards</span>
        <span>{{ graphStore.selectedNode.notes_count }} notas</span>
      </div>
      <div class="flex gap-2">
        <NuxtLink :to="`/revisar?topic_id=${graphStore.selectedNode.id}`" class="btn-primary !py-1.5 !px-3 !min-h-0 text-small flex-1 justify-center">
          Revisar
        </NuxtLink>
        <NuxtLink :to="`/cadernos?topic=${graphStore.selectedNode.id}&tab=cards`" class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small flex-1 justify-center">
          Ver cards
        </NuxtLink>
      </div>
    </div>

    <!-- Connect label modal -->
    <UiModal v-model="showLabelModal" size="sm">
      <h2 class="text-headline mb-4">Conectar cadernos</h2>
      <p class="text-small text-base-secondary mb-3">{{ connectSourceName }} ↔ {{ connectTargetName }}</p>
      <input v-model="connectLabel" class="input-base" placeholder="Label (opcional, ex: 'é exceção de')" @keydown.enter="confirmConnection" />
      <div class="flex gap-3 justify-end mt-4">
        <button class="btn-secondary" @click="cancelLabel">Cancelar</button>
        <button class="btn-primary" @click="confirmConnection">Conectar</button>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Link2, X, Maximize2 } from 'lucide-vue-next'

defineEmits<{ (e: 'expand'): void }>()

const graphStore = useGraphStore()
const toast = useToast()
const containerRef = ref<HTMLElement | null>(null)
const showOnlyWeak = ref(false)

// Connect mode
const connectMode = ref(false)
const connectSource = ref<string | null>(null)
const connectTarget = ref<string | null>(null)
const connectLabel = ref('')
const showLabelModal = ref(false)

const connectSourceName = computed(() => graphStore.data?.nodes.find(n => n.id === connectSource.value)?.name ?? '')
const connectTargetName = computed(() => graphStore.data?.nodes.find(n => n.id === connectTarget.value)?.name ?? '')

const graphNodes = computed(() => {
  const nodes = graphStore.data?.nodes ?? []
  if (!showOnlyWeak.value) return nodes
  return nodes.filter(n => n.progress < 0.3 && n.flashcards_count > 0)
})
const graphEdges = computed(() => {
  const edges = graphStore.data?.edges ?? []
  if (!showOnlyWeak.value) return edges
  const visibleIds = new Set(graphNodes.value.map(n => n.id))
  return edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
})

const { render, destroy } = useGraph(containerRef, graphNodes, graphEdges, {
  onNodeClick(id) {
    if (connectMode.value) {
      if (!connectSource.value) { connectSource.value = id }
      else if (id !== connectSource.value) { connectTarget.value = id; showLabelModal.value = true }
    } else {
      graphStore.fetchNodeDetails(id)
    }
  },
})

function recenter() { render() }
function startConnectMode() { connectMode.value = true; connectSource.value = null; connectTarget.value = null }
function cancelConnectMode() { resetConnectMode() }
function cancelLabel() { showLabelModal.value = false; resetConnectMode() }
function resetConnectMode() { connectMode.value = false; connectSource.value = null; connectTarget.value = null; connectLabel.value = ''; showLabelModal.value = false }

async function confirmConnection() {
  if (!connectSource.value || !connectTarget.value) return
  try {
    await graphStore.createConnection(connectSource.value, connectTarget.value, connectLabel.value || undefined)
    toast.show('Conexão criada!', 'success')
  } catch { toast.show('Erro ao criar conexão.', 'error') }
  resetConnectMode()
  await nextTick()
  render()
}

watch(showOnlyWeak, async () => { await nextTick(); render() })

// Load graph when component mounts
onMounted(async () => {
  await graphStore.fetchGraph()
  await nextTick()
  render()
})

onUnmounted(() => { destroy() })
</script>
