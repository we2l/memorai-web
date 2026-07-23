<template>
  <UiModal v-model="modelValue" size="lg">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline">🧠 Mapa Mental</h2>
      <span v-if="noteTitle" class="text-small text-base-muted truncate max-w-[200px]">{{ noteTitle }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="skeleton h-24 w-24 rounded-full" />
    </div>

    <!-- No map, Free user -->
    <div v-else-if="!mapData && !canGenerate" class="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div class="text-4xl">🔒</div>
      <p class="text-body text-base-secondary">Gere um mapa mental detalhado dos conceitos desta nota</p>
      <NuxtLink to="/planos" class="btn-primary !py-2 !px-4 text-small" @click="modelValue = false">
        Desbloquear com Plano Pro
      </NuxtLink>
    </div>

    <!-- No map, Pro user -->
    <div v-else-if="!mapData && canGenerate && !generating" class="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <div class="text-4xl">🧠</div>
      <p class="text-body text-base-secondary">Extraia conceitos, definições e exemplos desta nota em um mapa mental</p>
      <button class="btn-primary !py-2 !px-4 text-small" @click="generate">
        Gerar mapa mental
      </button>
    </div>

    <!-- Generating -->
    <div v-else-if="generating" class="flex flex-col items-center justify-center h-64 gap-3">
      <div class="w-8 h-8 border-3 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin" />
      <p class="text-small text-base-muted">Extraindo conceitos com IA...</p>
    </div>

    <!-- Map ready -->
    <template v-else>
      <!-- Legend + regenerate -->
      <div class="flex items-center justify-between mb-3">
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

      <!-- Markmap -->
      <div class="h-80 sm:h-96 relative overflow-hidden rounded-xl border border-base bg-[var(--bg-soft)]">
        <TopicMindMapRenderer :data="mapData" :color-by-type="true" @node-click="handleNodeClick" />
      </div>
    </template>

    <!-- Create card modal -->
    <UiModal v-model="showCardCreate" size="sm">
      <h3 class="text-headline mb-2">Criar card</h3>
      <div class="space-y-3">
        <div>
          <label class="text-small text-base-muted">Frente</label>
          <input v-model="cardFront" class="input-base mt-1" />
        </div>
        <div>
          <label class="text-small text-base-muted">Verso</label>
          <textarea v-model="cardBack" class="input-base mt-1 min-h-[80px]" />
        </div>
        <button class="btn-primary w-full" :disabled="!cardFront || !cardBack" @click="createCard">
          Criar card
        </button>
      </div>
    </UiModal>
  </UiModal>
</template>

<script setup lang="ts">
import type { MindMapNode } from '~/composables/useMindMap'

const modelValue = defineModel<boolean>({ required: true })

const props = defineProps<{
  noteId: string
  noteTitle?: string
}>()

const { $api } = useNuxtApp()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const generating = ref(false)
const mapData = ref<MindMapNode | null>(null)
const mapId = ref<string | null>(null)
const canGenerate = computed(() => auth.user?.plan !== 'free')

const showCardCreate = ref(false)
const cardFront = ref('')
const cardBack = ref('')

const typeColors: Record<string, string> = {
  conceito: '#6F3FF5',
  definição: '#3B82F6',
  exemplo: '#22C55E',
  exceção: '#EF4444',
  referência: '#8A90A8',
}

async function fetchMap() {
  loading.value = true
  try {
    const res = await $api<any>(`/notes/${props.noteId}/mindmap`)
    if (res.meta?.exists) {
      mapData.value = res.data
      mapId.value = res.meta.id
    }
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  try {
    const res = await $api<any>(`/notes/${props.noteId}/mindmap/generate`, { method: 'POST' })
    mapData.value = res.data
    mapId.value = res.meta.id
    toast.show('Mapa mental gerado!', 'success')
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao gerar mapa.', 'error')
  } finally {
    generating.value = false
  }
}

async function regenerate() {
  if (!confirm('Gerar novo mapa? O anterior será substituído.')) return
  await generate()
}

function handleNodeClick(node: MindMapNode) {
  cardFront.value = node.content
  cardBack.value = node.children.length > 0
    ? node.children.map(c => c.content).join('. ') + '.'
    : ''
  showCardCreate.value = true
}

async function createCard() {
  if (!mapId.value) return
  try {
    const decksRes = await $api<any>('/decks')
    const deckId = decksRes.data?.[0]?.id
    if (!deckId) { toast.show('Nenhum deck encontrado.', 'error'); return }

    await $api<any>(`/mindmaps/${mapId.value}/create-card`, {
      method: 'POST',
      body: { front: cardFront.value, back: cardBack.value, deck_id: deckId },
    })
    toast.show('Card criado ✓', 'success')
    showCardCreate.value = false
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao criar card.', 'error')
  }
}

watch(modelValue, (open) => {
  if (open) fetchMap()
})
</script>
