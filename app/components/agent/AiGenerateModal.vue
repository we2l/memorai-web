<template>
  <UiModal v-model="open" size="lg" aria-label="Gerar cards com IA">
    <div v-if="!generatedCards.length">
      <h2 class="text-heading mb-4">Gerar cards com IA</h2>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="px-4 py-2 rounded-lg text-small transition-colors"
          :class="source === tab.value ? 'bg-accent-primary text-white' : 'bg-surface-tertiary text-base-muted hover:text-base-primary'"
          role="tab"
          :aria-selected="source === tab.value"
          @click="source = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Free -->
      <div v-if="source === 'free'">
        <label for="ai-prompt" class="text-label mb-1 block">Tema</label>
        <input
          id="ai-prompt"
          v-model="prompt"
          type="text"
          class="input-base w-full"
          placeholder="Ex: Direito Constitucional — Art. 5º"
          maxlength="500"
        />
      </div>

      <!-- Notes -->
      <div v-if="source === 'notes'">
        <label for="ai-topic" class="text-label mb-1 block">Tópico</label>
        <select id="ai-topic" v-model="topicId" class="input-base w-full">
          <option value="">Selecione um tópico</option>
          <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>

      <!-- PDF -->
      <div v-if="source === 'pdf'">
        <label for="ai-doc" class="text-label mb-1 block">Documento</label>
        <select id="ai-doc" v-model="documentId" class="input-base w-full">
          <option value="">Selecione um PDF</option>
          <option v-for="d in documents" :key="d.id" :value="d.id">{{ d.original_name }}</option>
        </select>
      </div>

      <!-- Count -->
      <div class="mt-4">
        <label for="ai-count" class="text-label mb-1 block">Quantidade: {{ count }}</label>
        <input id="ai-count" v-model.number="count" type="range" min="1" max="10" class="w-full" />
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button class="btn-secondary" @click="open = false">Cancelar</button>
        <button class="btn-primary" :disabled="loading || !canGenerate" @click="generate">
          <span v-if="loading" class="animate-spin mr-2">⏳</span>
          {{ loading ? 'Gerando...' : 'Gerar cards' }}
        </button>
      </div>
    </div>

    <!-- Review -->
    <AgentAiReviewCards
      v-else
      :cards="generatedCards"
      :deck-id="deckId"
      :close-modal="onAccepted"
      @back="generatedCards = []"
    />
    
  </UiModal>
</template>

<script setup lang="ts">
import type { AiGeneratedCard, Document, Topic } from '~/types'

const props = defineProps<{
  deckId: string
}>()

const open = defineModel<boolean>({ required: true })
const emit = defineEmits<{ (e: 'created'): void }>()

const { $api } = useNuxtApp()

const source = ref<'free' | 'notes' | 'pdf'>('free')
const prompt = ref('')
const topicId = ref('')
const documentId = ref('')
const count = ref(5)
const loading = ref(false)
const generatedCards = ref<AiGeneratedCard[]>([])
const topics = ref<Topic[]>([])
const documents = ref<Document[]>([])

watch(open, async (val) => {
  if (val) {
    const [topicsRes, docsRes] = await Promise.all([
      $api<{ data: Topic[] }>('/topics').catch(() => ({ data: [] })),
      $api<{ data: Document[] }>('/documents').catch(() => ({ data: [] })),
    ])
    topics.value = topicsRes.data
    documents.value = docsRes.data.filter((d: Document) => d.status === 'completed')
  }
})

const tabs = [
  { label: 'Tema livre', value: 'free' as const },
  { label: 'A partir de notas', value: 'notes' as const },
  { label: 'A partir de PDF', value: 'pdf' as const },
]

const canGenerate = computed(() => {
  if (source.value === 'free') return prompt.value.trim().length > 0
  if (source.value === 'notes') return !!topicId.value
  if (source.value === 'pdf') return !!documentId.value
  return false
})

async function generate() {
  loading.value = true
  try {
    const body: Record<string, any> = {
      source: source.value,
      deck_id: props.deckId,
      count: count.value,
    }
    if (source.value === 'free') body.prompt = prompt.value
    if (source.value === 'notes') body.topic_id = topicId.value
    if (source.value === 'pdf') body.document_id = documentId.value

    const res = await $api<{ data: { cards: AiGeneratedCard[] } }>('/ai/generate-cards', {
      method: 'POST',
      body,
    })
    generatedCards.value = res.data.cards
  } catch (e: any) {
    useToast().show(e?.data?.message || 'Erro ao gerar cards', 'error')
  } finally {
    loading.value = false
  }
}

function onAccepted() {
  open.value = false
  emit('created')
  nextTick(() => {
    generatedCards.value = []
  })
}
</script>
