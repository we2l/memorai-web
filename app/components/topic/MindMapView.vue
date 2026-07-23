<template>
  <div class="flex flex-col h-full min-h-[400px] px-4 pt-4 pb-4">
    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="skeleton h-32 w-32 rounded-full" />
    </div>

    <!-- Empty state: < 3 notes -->
    <div v-else-if="meta?.min_notes_required" class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <div class="text-4xl">🧠</div>
      <p class="text-body text-base-secondary">Adicione pelo menos 3 notas com conteúdo para ver o mapa mental</p>
      <button class="btn-primary !py-2 !px-4 text-small" @click="$emit('create-note')">
        Criar nota
      </button>
    </div>

    <!-- Mind map content -->
    <template v-else>
      <!-- Toggle Nível 1 / Nível 2 -->
      <div v-if="isPro || aiMap" class="flex items-center gap-2 mb-3">
        <div class="inline-flex rounded-lg border border-base p-0.5 bg-surface-secondary">
          <button
            class="px-3 py-1.5 text-small rounded-md transition-colors"
            :class="activeLevel === 'auto' ? 'bg-[var(--bg-card)] shadow text-base-primary font-medium' : 'text-base-muted hover:text-base-primary'"
            @click="activeLevel = 'auto'"
          >
            Automático
          </button>
          <button
            class="px-3 py-1.5 text-small rounded-md transition-colors"
            :class="activeLevel === 'ai' ? 'bg-[var(--bg-card)] shadow text-base-primary font-medium' : 'text-base-muted hover:text-base-primary'"
            @click="activeLevel = 'ai'"
          >
            Detalhado (IA)
          </button>
        </div>
      </div>

      <!-- Banner: 3-4 notes -->
      <div v-if="meta && meta.total_notes >= 3 && meta.total_notes <= 4 && activeLevel === 'auto'" class="px-3 py-2 mb-3 rounded-lg bg-accent-primary-subtle text-accent-primary text-small text-center">
        🌱 Quanto mais notas, mais rico o mapa mental
      </div>

      <!-- Banner: truncated -->
      <div v-if="meta?.truncated && activeLevel === 'auto'" class="px-3 py-2 mb-3 rounded-lg bg-surface-secondary text-base-muted text-small text-center">
        Mostrando as 50 notas mais recentes de {{ meta.total_notes }}
      </div>

      <!-- Nível auto: markmap -->
      <div v-if="activeLevel === 'auto'" class="flex-1 relative overflow-hidden rounded-xl border border-base bg-[var(--bg-soft)]">
        <TopicMindMapRenderer :data="autoTree" />
      </div>

      <!-- Nível AI -->
      <div v-else class="flex-1 flex flex-col">
        <!-- Free user: CTA -->
        <div v-if="!isPro && !aiMap" class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div class="text-4xl">🔒</div>
          <p class="text-body text-base-secondary">Gere um mapa mental detalhado com conceitos extraídos por IA</p>
          <NuxtLink to="/planos" class="btn-primary !py-2 !px-4 text-small">
            Desbloquear com Plano Pro
          </NuxtLink>
        </div>

        <!-- Pro: no map yet -->
        <template v-else-if="!aiMap && !generating">
          <div class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div class="text-4xl">🧠</div>
            <p class="text-body text-base-secondary">Gere um mapa mental detalhado com conceitos, definições e exemplos extraídos por IA</p>
            <button class="btn-primary !py-2 !px-4 text-small" @click="generateAiMap">
              Gerar mapa detalhado com IA
            </button>
          </div>
        </template>

        <!-- Generating -->
        <div v-else-if="generating" class="flex-1 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 border-3 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p class="text-small text-base-muted">Extraindo conceitos com IA...</p>
        </div>

        <!-- AI map ready -->
        <template v-else>
          <div class="flex items-center justify-between mb-3">
            <!-- Legend -->
            <div class="flex items-center gap-2 flex-wrap">
              <span v-for="(color, type) in typeColors" :key="type" class="inline-flex items-center gap-1 text-micro text-base-muted">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ background: color }" />
                {{ type }}
              </span>
            </div>
            <button class="btn-secondary !py-1.5 !px-3 !min-h-0 text-small" @click="regenerate">
              Regenerar
            </button>
          </div>
          <div class="flex-1 relative overflow-hidden rounded-xl border border-base bg-[var(--bg-soft)]">
            <TopicMindMapRenderer :data="aiMap" :color-by-type="true" @node-click="handleNodeClick" />
          </div>
        </template>
      </div>
    </template>

    <!-- Node action popover -->
    <UiModal v-model="showNodeAction" size="sm">
      <h3 class="text-headline mb-2">{{ selectedNode?.content }}</h3>
      <p v-if="selectedNode?.payload?.type" class="text-small text-base-muted mb-4 capitalize">{{ selectedNode.payload.type }}</p>
      <button class="btn-primary w-full" @click="createCardFromNode">
        Criar card
      </button>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import type { MindMapNode } from '~/composables/useMindMap'

const props = defineProps<{
  topicId: string
}>()

defineEmits<{
  (e: 'create-note'): void
}>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const generating = ref(false)
const autoTree = ref<MindMapNode | null>(null)
const aiMap = ref<MindMapNode | null>(null)
const aiMapId = ref<string | null>(null)
const meta = ref<any>(null)
const activeLevel = ref<'auto' | 'ai'>('auto')
const showNodeAction = ref(false)
const selectedNode = ref<MindMapNode | null>(null)

const isPro = computed(() => auth.user?.plan === 'pro' || auth.user?.plan === 'premium')

const typeColors: Record<string, string> = {
  conceito: '#6F3FF5',
  definição: '#3B82F6',
  exemplo: '#22C55E',
  exceção: '#EF4444',
  referência: '#8A90A8',
}

async function fetchData() {
  loading.value = true
  try {
    const [autoRes, aiRes] = await Promise.all([
      $api<any>(`/topics/${props.topicId}/mindmap`),
      isPro.value ? $api<any>(`/topics/${props.topicId}/mindmap/ai`).catch(() => null) : Promise.resolve(null),
    ])

    autoTree.value = autoRes.data
    meta.value = autoRes.meta

    if (aiRes?.meta?.exists) {
      aiMap.value = aiRes.data
      aiMapId.value = aiRes.meta.id
    }
  } catch (e) {
    // silent
  } finally {
    loading.value = false
  }
}

async function generateAiMap() {
  generating.value = true
  try {
    const res = await $api<any>(`/topics/${props.topicId}/mindmap/generate`, { method: 'POST' })
    aiMap.value = res.data
    aiMapId.value = res.meta.id
    activeLevel.value = 'ai'
    toast.show('Mapa mental gerado!', 'success')
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao gerar mapa.', 'error')
  } finally {
    generating.value = false
  }
}

async function regenerate() {
  if (!confirm('Gerar novo mapa? O anterior será substituído.')) return
  await generateAiMap()
}

function handleNodeClick(node: MindMapNode) {
  if (!aiMap.value) return
  selectedNode.value = node
  showNodeAction.value = true
}

async function createCardFromNode() {
  if (!selectedNode.value || !aiMapId.value) return

  // Build back from children
  const back = selectedNode.value.children.length > 0
    ? selectedNode.value.children.map(c => c.content).join('. ') + '.'
    : selectedNode.value.content

  try {
    await $api<any>(`/mindmaps/${aiMapId.value}/create-card`, {
      method: 'POST',
      body: {
        front: selectedNode.value.content,
        back,
        deck_id: await resolveDeckId(),
      },
    })
    toast.show('Card criado ✓', 'success')
    showNodeAction.value = false
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao criar card.', 'error')
  }
}

async function resolveDeckId(): Promise<string> {
  // Use the first deck of the user (simple heuristic)
  const res = await $api<any>('/decks')
  return res.data?.[0]?.id ?? ''
}

watch(() => props.topicId, () => {
  if (props.topicId) fetchData()
}, { immediate: true })
</script>
