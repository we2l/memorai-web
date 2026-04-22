<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 bg-surface flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Mapa de Conhecimento"
        @keydown.escape="close"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-base shrink-0">
          <h2 class="text-title">Mapa de Conhecimento</h2>
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
            <button class="p-2 rounded-lg text-base-muted hover:text-base-secondary hover:bg-surface-tertiary" aria-label="Fechar mapa" @click="close">
              <X :size="20" />
            </button>
          </div>
        </div>

        <!-- Search bar -->
        <div class="absolute top-16 left-1/2 -translate-x-1/2 z-10 w-72">
          <input
            v-model="searchQuery"
            class="input-base w-full !text-small shadow-lg"
            placeholder="Buscar tópico..."
            @input="handleSearch"
          />
        </div>

        <!-- Connect mode banner -->
        <div v-if="connectMode" class="px-4 py-2 bg-accent-primary-subtle text-accent-primary text-small text-center shrink-0">
          {{ connectSource ? 'Clique no segundo tópico para conectar' : 'Clique no primeiro tópico' }}
          <span v-if="connectSource" class="font-medium"> — {{ connectSourceName }}</span>
        </div>

        <div class="flex flex-1 overflow-hidden">
          <!-- Graph container -->
          <div v-if="graphStore.loading" class="flex-1 flex items-center justify-center">
            <div class="skeleton h-64 w-64 rounded-full" />
          </div>
          <div v-else-if="!graphStore.data?.nodes.length" class="flex-1 flex flex-col items-center justify-center">
            <p class="text-title text-base-secondary">Nenhum tópico ainda</p>
            <p class="text-small text-base-muted mt-1">Crie tópicos para ver seu mapa.</p>
          </div>
          <div v-else ref="containerRef" class="flex-1 relative overflow-hidden" />

          <!-- Node detail panel -->
          <aside
            v-if="graphStore.selectedNode"
            class="w-80 border-l border-base bg-surface-secondary flex flex-col overflow-y-auto shrink-0"
          >
            <div class="p-4 border-b border-base">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-title truncate">{{ graphStore.selectedNode.name }}</h3>
                <button class="p-1 rounded hover:bg-surface-tertiary" @click="graphStore.clearSelection()">
                  <X :size="16" class="text-base-muted" />
                </button>
              </div>
              <div class="flex items-center gap-2 mb-3">
                <div class="flex-1 h-2 rounded-full bg-surface-tertiary">
                  <div
                    class="h-2 rounded-full transition-all"
                    :class="graphStore.selectedNode.progress < 0.3 ? 'bg-danger' : graphStore.selectedNode.progress < 0.7 ? 'bg-warning' : 'bg-success'"
                    :style="{ width: Math.round(graphStore.selectedNode.progress * 100) + '%' }"
                  />
                </div>
                <span class="text-micro text-base-muted">{{ Math.round(graphStore.selectedNode.progress * 100) }}%</span>
              </div>
              <div class="flex gap-4 text-micro text-base-muted">
                <span>{{ graphStore.selectedNode.flashcards_count }} cards</span>
                <span>{{ graphStore.selectedNode.notes_count }} notas</span>
              </div>
            </div>
            <div class="p-4 flex flex-col gap-2">
              <NuxtLink :to="`/review?topic_id=${graphStore.selectedNode.id}`" class="btn-primary text-small justify-center">
                Revisar tópico
              </NuxtLink>
              <NuxtLink :to="`/topics?topic=${graphStore.selectedNode.id}`" class="btn-secondary text-small justify-center" @click="close">
                Ver tópico
              </NuxtLink>
            </div>
          </aside>
        </div>

        <!-- Recenter button -->
        <button
          v-if="graphStore.data?.nodes.length"
          class="absolute bottom-4 right-4 p-3 rounded-lg bg-surface-secondary border border-base shadow-lg text-base-muted hover:text-base-primary transition-colors"
          title="Recentralizar"
          @click="recenter"
        >
          <Maximize2 :size="18" />
        </button>

        <!-- Legend -->
        <div v-if="graphStore.data?.nodes.length" class="absolute bottom-4 left-4 flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-surface-secondary/90 backdrop-blur text-micro text-base-muted border border-base">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-[#6B7280] inline-block" /> Sem cards</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-danger inline-block" /> &lt; 30%</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-warning inline-block" /> 30-70%</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-success inline-block" /> &gt; 70%</span>
        </div>

        <!-- Connect label modal -->
        <UiModal v-model="showLabelModal" size="sm">
          <h2 class="text-headline mb-4">Conectar tópicos</h2>
          <p class="text-small text-base-secondary mb-3">{{ connectSourceName }} ↔ {{ connectTargetName }}</p>
          <input v-model="connectLabel" class="input-base" placeholder="Label (opcional)" @keydown.enter="confirmConnection" />
          <div class="flex gap-3 justify-end mt-4">
            <button class="btn-secondary" @click="cancelLabel">Cancelar</button>
            <button class="btn-primary" @click="confirmConnection">Conectar</button>
          </div>
        </UiModal>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Link2, X, Maximize2 } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const graphStore = useGraphStore()
const toast = useToast()
const containerRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')

// Connect mode
const connectMode = ref(false)
const connectSource = ref<string | null>(null)
const connectTarget = ref<string | null>(null)
const connectLabel = ref('')
const showLabelModal = ref(false)

const connectSourceName = computed(() => graphStore.data?.nodes.find(n => n.id === connectSource.value)?.name ?? '')
const connectTargetName = computed(() => graphStore.data?.nodes.find(n => n.id === connectTarget.value)?.name ?? '')

const graphNodes = computed(() => graphStore.data?.nodes ?? [])
const graphEdges = computed(() => graphStore.data?.edges ?? [])

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

function close() {
  emit('update:modelValue', false)
}

function recenter() {
  render()
}

function handleSearch() {
  if (!searchQuery.value.trim()) return
  const node = graphStore.data?.nodes.find(n => n.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (node) graphStore.fetchNodeDetails(node.id)
}

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

watch(() => props.modelValue, async (open) => {
  if (open) {
    await graphStore.fetchGraph()
    await nextTick()
    render()
  } else {
    destroy()
  }
})
</script>
