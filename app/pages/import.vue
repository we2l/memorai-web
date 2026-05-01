<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-display mb-6">Importar Anki</h1>

    <!-- Step 1: Upload -->
    <div v-if="!store.importId" class="card p-8 text-center">
      <Upload :size="48" class="mx-auto text-base-muted mb-4" />
      <p class="text-title mb-2">Selecione seu arquivo .apkg</p>
      <p class="text-small text-base-muted mb-6">Suporta decks exportados do Anki (até 500MB)</p>

      <label
        class="btn-primary cursor-pointer inline-flex"
        :class="{ 'opacity-50 pointer-events-none': store.uploading }"
      >
        {{ store.uploading ? 'Enviando...' : 'Selecionar arquivo' }}
        <input type="file" accept=".apkg" class="hidden" @change="handleFile" :disabled="store.uploading">
      </label>

      <div
        class="mt-6 border-2 border-dashed border-surface-tertiary rounded-xl p-8 transition-colors"
        :class="dragOver ? 'border-accent-primary bg-accent-primary/5' : ''"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="handleDrop"
      >
        <p class="text-small text-base-muted">ou arraste e solte aqui</p>
      </div>
    </div>

    <!-- Step 2: Preview -->
    <div v-else-if="store.preview && (!store.status || store.status.status === 'previewing')" class="space-y-4">
      <div class="card p-5">
        <p class="text-title mb-4">Preview da importação</p>

        <!-- Decks -->
        <div class="mb-4">
          <p class="text-label mb-2">Decks ({{ store.preview.decks.length }})</p>
          <div v-for="deck in store.preview.decks" :key="deck.name" class="flex items-center justify-between py-2 border-b border-surface-tertiary last:border-0">
            <div>
              <span class="text-small text-base-primary">{{ deck.name }}</span>
              <span class="text-micro text-base-muted ml-2">{{ deck.cards_count }} cards</span>
            </div>
            <div v-if="deck.conflict" class="flex items-center gap-2">
              <span class="text-micro text-warning">⚠ Já existe</span>
              <UiSelect
                :model-value="store.deckConflicts[deck.name]"
                @update:model-value="store.deckConflicts[deck.name] = $event"
                :options="[{ value: 'import', label: 'Importar como novo' }, { value: 'skip', label: 'Pular' }]"
              />
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-surface-tertiary rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.total_cards }}</p>
            <p class="text-micro text-base-muted">Cards</p>
          </div>
          <div class="bg-surface-tertiary rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.tags.length }}</p>
            <p class="text-micro text-base-muted">Tags → Cadernos</p>
          </div>
          <div class="bg-surface-tertiary rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.media_count }}</p>
            <p class="text-micro text-base-muted">Media</p>
          </div>
        </div>

        <!-- Note types -->
        <div class="mb-4">
          <p class="text-label mb-2">Tipos de card</p>
          <div class="flex gap-3 text-small">
            <span v-if="store.preview.note_types.Basic" class="px-2 py-1 rounded bg-surface-tertiary">Basic: {{ store.preview.note_types.Basic }}</span>
            <span v-if="store.preview.note_types.Cloze" class="px-2 py-1 rounded bg-surface-tertiary">Cloze: {{ store.preview.note_types.Cloze }}</span>
            <span v-if="store.preview.note_types.Other" class="px-2 py-1 rounded bg-surface-tertiary">Outros: {{ store.preview.note_types.Other }}</span>
          </div>
        </div>

        <!-- Tags preview -->
        <div v-if="store.preview.tags.length">
          <p class="text-label mb-2">Tags encontradas</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="tag in store.preview.tags" :key="tag" class="px-2 py-0.5 rounded-full bg-surface-tertiary text-micro text-base-muted">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex gap-3 justify-end">
        <button class="btn-secondary" @click="cancel">Cancelar</button>
        <button class="btn-primary" @click="confirmImport">Confirmar importação</button>
      </div>
    </div>

    <!-- Step 3: Progress -->
    <div v-else-if="store.status && (store.status.status === 'processing' || store.status.status === 'confirmed')" class="card p-8 text-center">
      <div class="animate-pulse text-4xl mb-4">⏳</div>
      <p class="text-title mb-2">Importando...</p>
      <p class="text-small text-base-muted mb-4">{{ stepLabel }}</p>

      <div class="w-full h-3 rounded-full bg-surface-tertiary overflow-hidden mb-2">
        <div
          class="h-3 rounded-full bg-accent-primary transition-all duration-500"
          :style="{ width: (store.status.progress_percent ?? 0) + '%' }"
        />
      </div>
      <p class="text-micro text-base-muted">
        <template v-if="store.status.imported_cards">
          {{ store.status.imported_cards }}/{{ store.status.total_cards }} cards
        </template>
        <template v-else>
          {{ store.status.progress_percent ?? 0 }}%
        </template>
      </p>
    </div>

    <!-- Step 4: Completed -->
    <div v-else-if="store.status?.status === 'completed'" class="card p-8 text-center">
      <p class="text-5xl mb-4">🎉</p>
      <h2 class="text-display mb-2">Importação concluída!</h2>
      <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto mt-4 mb-6">
        <div class="bg-surface-tertiary rounded-lg p-3">
          <p class="text-title text-accent-primary">{{ store.status.stats?.decks_created }}</p>
          <p class="text-micro text-base-muted">Decks</p>
        </div>
        <div class="bg-surface-tertiary rounded-lg p-3">
          <p class="text-title text-accent-primary">{{ store.status.stats?.cards_created }}</p>
          <p class="text-micro text-base-muted">Cards</p>
        </div>
        <div class="bg-surface-tertiary rounded-lg p-3">
          <p class="text-title text-accent-primary">{{ store.status.stats?.topics_created }}</p>
          <p class="text-micro text-base-muted">Cadernos</p>
        </div>
        <div class="bg-surface-tertiary rounded-lg p-3">
          <p class="text-title text-accent-primary">{{ store.status.stats?.media_extracted }}</p>
          <p class="text-micro text-base-muted">Media</p>
        </div>
      </div>
      <NuxtLink to="/topics" class="btn-primary">Ver cadernos</NuxtLink>
    </div>

    <!-- Failed -->
    <div v-else-if="store.status?.status === 'failed'" class="card p-8 text-center">
      <p class="text-4xl mb-4">❌</p>
      <h2 class="text-display mb-2">Erro na importação</h2>
      <p class="text-small text-base-muted mb-4">{{ store.status.error }}</p>
      <button class="btn-primary" @click="retryImport">Tentar novamente</button>
    </div>

    <!-- Loading -->
    <div v-else-if="store.loading" class="card p-8 text-center">
      <div class="skeleton h-48 rounded-xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Upload } from 'lucide-vue-next'

const store = useImportStore()
const toast = useToast()
const dragOver = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

const stepLabel = computed(() => {
  const step = store.status?.current_step
  const map: Record<string, string> = {
    creating_decks: 'Criando decks...',
    creating_topics: 'Criando cadernos...',
    importing_cards: 'Importando cards...',
    extracting_media: 'Extraindo media...',
  }
  return map[step ?? ''] ?? 'Processando...'
})

async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await uploadFile(file)
}

async function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) await uploadFile(file)
}

async function uploadFile(file: File) {
  if (!file.name.endsWith('.apkg')) {
    toast.show('Selecione um arquivo .apkg válido.', 'error')
    return
  }
  try {
    await store.upload(file)
    await store.fetchPreview()
  } catch {
    toast.show('Erro ao processar arquivo.', 'error')
    store.reset()
  }
}

async function confirmImport() {
  try {
    await store.confirm()
    startPolling()
  } catch {
    toast.show('Erro ao iniciar importação.', 'error')
  }
}

function startPolling() {
  pollInterval = setInterval(async () => {
    await store.pollStatus()
    if (store.status?.status === 'completed' || store.status?.status === 'failed') {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function retryImport() {
  try {
    store.status = null
    await store.confirm()
    startPolling()
  } catch {
    toast.show('Erro ao reprocessar importação.', 'error')
  }
}

function cancel() {
  stopPolling()
  store.reset()
}

onMounted(() => {
  store.reset()
})

onUnmounted(() => {
  stopPolling()
})
</script>
