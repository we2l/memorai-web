<template>
  <UiDialog v-model="modelValue" title="Mapa da nota" :description="noteTitle || undefined" size="lg">
    <!-- Loading -->
    <div v-if="loading" class="flex h-64 items-center justify-center" aria-busy="true">
      <span class="sr-only" role="status">Carregando o mapa…</span>
      <UiSkeleton variant="block" size="lg" class="w-full" />
    </div>

    <!-- No map, Free after the trial -->
    <div v-else-if="!mapData && !canGenerate && !usage.paid.value" class="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <Lock class="size-7 text-fg-muted" aria-hidden="true" />
      <p class="text-body text-fg">Gere um mapa mental com os conceitos desta nota</p>
      <UiButton variant="primary" to="/planos" @click="modelValue = false">Conhecer o {{ proName }}</UiButton>
    </div>

    <!-- No map, the paid plan, the trial or a trial that opens on this click -->
    <div v-else-if="!mapData && !generating" class="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <Brain class="size-7 text-action-fg" aria-hidden="true" />
      <p class="text-body text-fg">Extraia conceitos, definições e exemplos desta nota em um mapa mental</p>
      <UiButton variant="primary" :disabled="usage.atLimit('mindmap_ai')" @click="generate">Gerar mapa mental</UiButton>
      <LazyPlansUsageNotice feature="mindmap_ai" :usage="usage" />
    </div>

    <!-- Generating -->
    <div v-else-if="generating" class="flex h-64 flex-col items-center justify-center gap-3" role="status">
      <UiSpinner />
      <p class="text-meta text-fg-muted">Extraindo conceitos com IA…</p>
    </div>

    <!-- Map ready -->
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <span v-for="(color, type) in typeColors" :key="type" class="inline-flex items-center gap-1 text-label text-fg-muted">
            <span class="size-2.5 rounded-full" :style="{ background: color }" aria-hidden="true" />
            {{ type }}
          </span>
        </div>
        <span class="flex flex-wrap items-center justify-end gap-2">
          <LazyPlansUsageNotice feature="mindmap_ai" :usage="usage" />
          <UiButton size="sm" :disabled="usage.atLimit('mindmap_ai')" @click="regenerate">Gerar de novo</UiButton>
        </span>
      </div>
      <div class="relative h-80 overflow-hidden rounded-row bg-soft sm:h-96">
        <TopicMindMapRenderer :data="mapData" :color-by-type="true" @node-click="handleNodeClick" />
      </div>
    </template>
  </UiDialog>

  <!-- Card from a node of the map -->
  <UiDialog v-model="showCardCreate" title="Criar card" size="sm">
    <form :id="formId" class="flex flex-col gap-3" @submit.prevent="createCard">
      <UiInput v-model="cardFront" label="Frente" />
      <UiTextarea v-model="cardBack" label="Verso" :rows="3" />
    </form>
    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton type="submit" :form="formId" variant="primary" :disabled="!cardFront || !cardBack">Criar card</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
import { Brain, Lock } from 'lucide-vue-next'
import type { MindMapNode } from '~/composables/useMindMap'

const modelValue = defineModel<boolean>({ required: true })

const props = defineProps<{
  noteId: string
  noteTitle?: string
}>()

const { $api } = useNuxtApp()
const aiJob = useAiJob()
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const generating = ref(false)
const mapData = ref<MindMapNode | null>(null)
const mapId = ref<string | null>(null)
// meta.can_generate of GET /notes/{id}/mindmap (the paid plan, the trial and a trial that opens on the click)
const serverCanGenerate = ref<boolean | null>(null)
const canGenerate = computed(() => serverCanGenerate.value ?? (auth.hasProAccess || auth.opensTrialOnUse))
const proName = useProName()
// The paid plan's month of maps (prd-uso-justo RF-F3): /usage once per opening; at the limit the paid plan sees
// the day it starts again, never "Conhecer o Intensivo" (RN-3)
const usage = usePaidQuota()

const showCardCreate = ref(false)
const formId = useId()
const cardFront = ref('')
const cardBack = ref('')

const typeColors: Record<string, string> = {
  conceito: 'var(--action)',
  definição: 'var(--state-info)',
  exemplo: 'var(--state-success)',
  exceção: 'var(--state-danger)',
  referência: 'var(--fg-muted)',
}

async function fetchMap() {
  loading.value = true
  try {
    const res = await $api<any>(`/notes/${props.noteId}/mindmap`)
    if (res.meta?.exists) {
      mapData.value = res.data
      mapId.value = res.meta.id
    } else if (typeof res.meta?.can_generate === 'boolean') {
      serverCanGenerate.value = res.meta.can_generate
    }
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível carregar o mapa mental da nota.' })
  } finally {
    loading.value = false
  }
}

async function generate() {
  if (usage.atLimit('mindmap_ai')) return
  generating.value = true
  try {
    // 202 + job polled until done (RF-30)
    const res = await aiJob.run<{ data: any, meta: { id: string } }>(`/notes/${props.noteId}/mindmap/generate`)
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
    // The API puts the card in the deck of the note's caderno (F1 RF-B3): no deck_id to send
    await $api<any>(`/mindmaps/${mapId.value}/create-card`, {
      method: 'POST',
      body: { front: cardFront.value, back: cardBack.value },
    })
    toast.show('Card criado ✓', 'success')
    showCardCreate.value = false
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao criar card.', 'error')
  }
}

watch(modelValue, (open) => {
  if (!open) return
  fetchMap()
  void usage.fetchUsageForNotice()
})
</script>
