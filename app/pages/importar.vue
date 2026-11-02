<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-display mb-6">Importar Anki</h1>

    <!-- Step 1: Upload -->
    <div v-if="!store.importId" class="card p-8 text-center">
      <Upload :size="48" class="mx-auto text-base-muted mb-4" />
      <p class="text-title mb-2">Selecione seu arquivo .apkg</p>
      <p class="text-small text-base-muted mb-6">Suporta baralhos exportados do Anki (até 500MB)</p>

      <label
        class="btn-primary cursor-pointer inline-flex"
        :class="{ 'opacity-50 pointer-events-none': store.uploading }"
      >
        {{ store.uploading ? 'Enviando...' : 'Selecionar arquivo' }}
        <input type="file" accept=".apkg" class="hidden" @change="handleFile" :disabled="store.uploading">
      </label>

      <div
        class="mt-6 border border-base bg-[var(--bg-card)] rounded-xl p-8 transition-all"
        :class="dragOver ? 'border-[var(--color-accent-primary)]/20 bg-surface-secondary' : 'hover:border-strong'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="handleDrop"
      >
        <p class="text-sm text-base-muted">ou arraste e solte aqui</p>
      </div>
    </div>

    <!-- Step 2: Preview -->
    <div v-else-if="store.preview && (!store.status || store.status.status === 'previewing')" class="space-y-4">
      <div class="card p-5">
        <p class="text-title mb-4">Preview da importação</p>

        <!-- Baralhos do Anki -->
        <div class="mb-4">
          <p class="text-label mb-2">Baralhos do Anki ({{ store.preview.decks.length }})</p>
          <div v-for="deck in store.preview.decks" :key="deck.name" class="flex items-center justify-between py-2 border-b border-base last:border-0">
            <div>
              <span class="text-small text-base-primary">{{ deck.name }}</span>
              <span class="text-micro text-base-muted ml-2">{{ deck.cards_count }} cards</span>
            </div>
            <div v-if="deck.conflict" class="flex items-center gap-2">
              <span class="text-micro text-[var(--badge-warning-text)] inline-flex items-center gap-0.5"><AlertTriangle :size="10" /> Já existe</span>
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
          <div class="bg-[var(--border-divider)] rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.total_cards }}</p>
            <p class="text-micro text-base-muted">Cards</p>
          </div>
          <div class="bg-[var(--border-divider)] rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.tags.length }}</p>
            <p class="text-micro text-base-muted">Tags → Cadernos</p>
          </div>
          <div class="bg-[var(--border-divider)] rounded-lg p-3 text-center">
            <p class="text-title text-accent-primary">{{ store.preview.media_count }}</p>
            <p class="text-micro text-base-muted">Media</p>
          </div>
        </div>

        <!-- Note types -->
        <div class="mb-4">
          <p class="text-label mb-2">Tipos de card</p>
          <div class="flex gap-3 text-small">
            <span v-if="store.preview.note_types.Basic" class="px-2 py-1 rounded bg-[var(--border-divider)]">Pergunta e resposta: {{ store.preview.note_types.Basic }}</span>
            <span v-if="store.preview.note_types.Cloze" class="px-2 py-1 rounded bg-[var(--border-divider)]">Lacuna: {{ store.preview.note_types.Cloze }}</span>
            <span v-if="store.preview.note_types.Other" class="px-2 py-1 rounded bg-[var(--border-divider)]">Outros: {{ store.preview.note_types.Other }}</span>
          </div>
        </div>

        <!-- Tags preview -->
        <div v-if="store.preview.tags.length">
          <p class="text-label mb-2">Tags encontradas</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="tag in store.preview.tags" :key="tag" class="px-2 py-0.5 rounded-full bg-[var(--border-divider)] text-micro text-base-muted">
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

      <div class="w-full h-3 rounded-full bg-[var(--border-divider)] overflow-hidden mb-2">
        <div
          class="h-3 rounded-full bg-[var(--color-accent-soft)] transition-all duration-500"
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

    <!-- Step 4: Completed: the CTA opens the caderno the import wrote to (N4), not the first of the tree -->
    <UiSection v-else-if="store.status?.status === 'completed'" class="text-center">
      <UiBaigiMascot :size="96" state="celebrating" class="mx-auto" />
      <h2 class="mt-3 text-section text-fg-strong">Importação concluída!</h2>
      <p class="mt-1 text-meta text-fg-muted">Seus baralhos do Anki viraram cadernos.</p>
      <dl class="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
        <div>
          <dt class="text-label text-fg-muted">Cards</dt>
          <dd class="text-section text-fg-strong tabular-nums">{{ store.status.stats?.cards_created ?? 0 }}</dd>
        </div>
        <div>
          <dt class="text-label text-fg-muted">Cadernos e assuntos</dt>
          <dd class="text-section text-fg-strong tabular-nums">{{ store.status.stats?.topics_created ?? 0 }}</dd>
        </div>
        <div>
          <dt class="text-label text-fg-muted">Mídias</dt>
          <dd class="text-section text-fg-strong tabular-nums">{{ store.status.stats?.media_extracted ?? 0 }}</dd>
        </div>
      </dl>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <UiButton v-if="importedRoot" variant="primary" :to="cadernoPath(importedRoot.id)">Abrir {{ importedRoot.name }}</UiButton>
        <UiButton :variant="importedRoot ? 'secondary' : 'primary'" to="/cadernos">Ver cadernos</UiButton>
      </div>
    </UiSection>

    <!-- Failed -->
    <div v-else-if="store.status?.status === 'failed'" class="card p-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4"><XCircle :size="28" class="text-[var(--badge-danger-text)]" /></div>
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
import { Upload, XCircle, AlertTriangle } from 'lucide-vue-next'
import { PREVIEW_TIMEOUT_MESSAGE } from '~/stores/import'
import { cadernoPath, findImportedRoot } from '~/utils/scope'

const store = useImportStore()
const toast = useToast()
const dragOver = ref(false)
// Stops on unmount (component scope) and while the tab is hidden
const statusPoll = usePoll(() => store.pollStatus(), {
  interval: 2000,
  immediate: false,
  until: () => store.status?.status === 'completed' || store.status?.status === 'failed',
})

const stepLabel = computed(() => {
  const step = store.status?.current_step
  const map: Record<string, string> = {
    creating_decks: 'Criando cadernos...',
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
  } catch (e: any) {
    toast.show(e?.data?.errors?.file?.[0] || e?.data?.message || (e?.message === PREVIEW_TIMEOUT_MESSAGE ? e.message : 'Erro ao processar arquivo.'), 'error')
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

// The caderno the import wrote to: the first imported (not skipped) root deck, by name (N4)
const topicStore = useTopicStore()
const importedRoot = ref<{ id: string; name: string } | null>(null)
watch(() => store.status?.status, async (status) => {
  if (status !== 'completed') return
  const decks = (store.preview?.decks ?? []).map(d => d.name).filter(name => store.deckConflicts[name] !== 'skip')
  try {
    await topicStore.fetchTree()
    importedRoot.value = findImportedRoot(topicStore.tree, decks)
  } catch (e) {
    // The generic "Ver cadernos" stays
    reportApiError(e, { silent: true })
  }
})

function startPolling() {
  statusPoll.start()
}

function stopPolling() {
  statusPoll.stop()
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

</script>
