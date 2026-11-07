<template>
  <div class="flex h-full min-h-100 flex-col px-gutter py-4">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-1 items-center justify-center" aria-busy="true">
      <UiSkeleton variant="block" size="lg" class="w-full" />
    </div>

    <!-- Empty state: < 3 notes -->
    <UiEmptyState v-else-if="meta?.min_notes_required" title="Ainda não há um mapa" description="Adicione pelo menos 3 notas com conteúdo para ver o mapa mental.">
      <template #action>
        <UiButton variant="primary" @click="$emit('create-note')">Criar nota</UiButton>
      </template>
    </UiEmptyState>

    <!-- Mind map content -->
    <template v-else>
      <UiTabs v-if="isPro || aiMap" v-model="activeLevel" :tabs="LEVELS" label="Tipo de mapa" class="mb-3" />

      <p v-if="meta && meta.total_notes >= 3 && meta.total_notes <= 4 && activeLevel === 'auto'" class="mb-3 text-meta text-fg-muted">
        Quanto mais notas, mais rico o mapa mental.
      </p>

      <p v-if="meta?.truncated && activeLevel === 'auto'" class="mb-3 text-meta text-fg-muted">
        Mostrando as 50 notas mais recentes de {{ meta.total_notes }}.
      </p>

      <!-- Automatic -->
      <div v-if="activeLevel === 'auto'" class="relative flex-1 overflow-hidden rounded-card border border-line-strong bg-subtle">
        <TopicMindMapRenderer :data="autoTree" />
      </div>

      <!-- AI -->
      <div v-else class="flex flex-1 flex-col">
        <!-- Free after the trial: what the paid plan gives -->
        <UiEmptyState v-if="!isPro && !aiMap" :title="`Mapa detalhado no ${proName}`" description="Gere um mapa mental detalhado com conceitos extraídos por IA.">
          <template #action>
            <UiButton variant="primary" to="/planos">Conhecer o {{ proName }}</UiButton>
          </template>
        </UiEmptyState>

        <!-- Pro, the trial or a trial that opens on this click: no map yet -->
        <UiEmptyState v-else-if="!aiMap && !generating" title="Mapa detalhado com IA" description="Gere um mapa mental com conceitos, definições e exemplos extraídos por IA.">
          <template #action>
            <div class="flex flex-col items-center gap-2">
              <UiButton variant="primary" :disabled="usage.atLimit('mindmap_ai')" @click="generateAiMap">Gerar mapa detalhado</UiButton>
              <LazyPlansUsageNotice feature="mindmap_ai" :usage="usage" class="text-center" />
            </div>
          </template>
        </UiEmptyState>

        <!-- Generating -->
        <p v-else-if="generating" class="flex flex-1 items-center justify-center gap-2 text-meta text-fg-muted" role="status">
          <UiSpinner size="sm" /> Extraindo conceitos com IA…
        </p>

        <!-- AI map ready -->
        <template v-else>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <span v-for="item in TYPE_LEGEND" :key="item.type" class="inline-flex items-center gap-1 text-label text-fg-muted">
                <span class="size-2.5 rounded-full" :class="item.mark" aria-hidden="true" />
                {{ item.type }}
              </span>
            </div>
            <span class="flex flex-wrap items-center justify-end gap-2">
              <LazyPlansUsageNotice feature="mindmap_ai" :usage="usage" />
              <UiButton size="sm" :disabled="usage.atLimit('mindmap_ai')" @click="confirmRegenerate = true">Gerar de novo</UiButton>
            </span>
          </div>
          <div class="relative flex-1 overflow-hidden rounded-card border border-line-strong bg-subtle">
            <TopicMindMapRenderer :data="aiMap" :color-by-type="true" @node-click="handleNodeClick" />
          </div>
        </template>
      </div>
    </template>

    <UiDialog v-model="showNodeAction" size="sm" :title="selectedNode?.content ?? ''" :description="nodeType">
      <template #footer>
        <UiButton variant="primary" block @click="createCardFromNode">Criar card</UiButton>
      </template>
    </UiDialog>

    <UiConfirmModal
      v-model="confirmRegenerate"
      title="Gerar o mapa de novo?"
      message="O mapa atual será substituído."
      confirm-label="Gerar de novo"
      variant="primary"
      @confirm="regenerate"
    />
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
const aiJob = useAiJob()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const generating = ref(false)
const autoTree = ref<MindMapNode | null>(null)
const aiMap = ref<MindMapNode | null>(null)
const aiMapId = ref<string | null>(null)
const meta = ref<any>(null)
const activeLevel = ref('auto')
const showNodeAction = ref(false)
const selectedNode = ref<MindMapNode | null>(null)

// The AI map: the paid plan, the trial (RN-03) and a Free account whose trial opens on the click (RF-F7b)
const isPro = computed(() => auth.hasProAccess || auth.opensTrialOnUse)
const proName = useProName(() => !isPro.value)
// The paid plan's month of maps (prd-uso-justo RF-F3): /usage once per opening, only for the paid plan
const usage = usePaidQuota()

const LEVELS = [{ key: 'auto', label: 'Automático' }, { key: 'ai', label: 'Detalhado (IA)' }]
// The same tokens of the branches (useMindMap)
const TYPE_LEGEND = [
  { type: 'conceito', mark: 'bg-action-fg' },
  { type: 'definição', mark: 'bg-info' },
  { type: 'exemplo', mark: 'bg-success' },
  { type: 'exceção', mark: 'bg-danger' },
  { type: 'referência', mark: 'bg-fg-muted' },
]
const nodeType = computed(() => {
  const type = selectedNode.value?.payload?.type
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : undefined
})
const confirmRegenerate = ref(false)

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
    reportApiError(e, { error: 'Não foi possível carregar o mapa mental.' })
  } finally {
    loading.value = false
  }
}

async function generateAiMap() {
  if (usage.atLimit('mindmap_ai')) return
  generating.value = true
  try {
    // 202 + job polled until done (RF-30)
    const res = await aiJob.run<{ data: any, meta: { id: string } }>(`/topics/${props.topicId}/mindmap/generate`)
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
  confirmRegenerate.value = false
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
      // The API puts the card in the deck of the caderno (F1 RF-B3): no deck_id to send
      body: {
        front: selectedNode.value.content,
        back,
      },
    })
    toast.show('Card criado', 'success')
    showNodeAction.value = false
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao criar card.', 'error')
  }
}

watch(() => props.topicId, () => {
  if (props.topicId) fetchData()
}, { immediate: true })
onMounted(() => { void usage.fetchUsageIfPaid() })
</script>
