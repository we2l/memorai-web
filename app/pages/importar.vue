<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Importar do Anki" :back="back" />

    <!-- 1. The file -->
    <UiSection
      v-if="!store.importId"
      class="flex flex-col items-center gap-3 rounded-card border border-dashed text-center transition-colors duration-fast"
      :class="dragOver ? 'border-action bg-action-subtle' : 'border-line-strong'"
      data-testid="import-drop"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="handleDrop"
    >
      <Upload class="size-10 text-fg-muted" aria-hidden="true" />
      <h2 class="text-section text-fg-strong">Selecione seu arquivo .apkg</h2>
      <p class="max-w-sm text-body text-fg-muted" data-testid="import-hint">No Anki: <span class="font-semibold text-fg">Arquivo → Exportar → Pacote de baralho (.apkg)</span>, com “Incluir informações de agendamento” marcado para manter o progresso. Envie aqui, até 500&nbsp;MB, ou arraste o arquivo para esta área.</p>
      <p v-if="fileError" class="max-w-sm text-meta text-danger" role="alert" data-testid="import-file-error">{{ fileError }}</p>
      <UiButton variant="primary" :loading="store.uploading" class="mt-2" @click="fileInput?.click()">
        {{ store.uploading ? 'Enviando…' : 'Selecionar arquivo' }}
      </UiButton>
      <input ref="fileInput" type="file" accept=".apkg" class="hidden" aria-label="Arquivo .apkg" :disabled="store.uploading" @change="handleFile">
    </UiSection>

    <!-- 2. Preview: how the decks become cadernos, and where they go -->
    <template v-else-if="store.preview && !store.status">
      <UiSection title="Prévia da importação" :aria-busy="store.mappingLoading ? 'true' : undefined" data-testid="import-preview">
        <p class="text-body text-fg" data-testid="import-summary">
          <span class="font-semibold text-fg-strong tabular-nums">{{ countOf(store.preview.total_cards, 'card', 'cards') }}</span>
          <template v-if="noteTypes"> · {{ noteTypes }}</template>
          <template v-if="store.preview.media_count"> · {{ countOf(store.preview.media_count, 'mídia', 'mídias') }}</template>
        </p>

        <div class="mt-4 border-t border-hairline pt-4" data-testid="import-mapping">
          <h3 class="text-meta font-semibold text-fg-strong">Como fica no Baigi</h3>
          <template v-if="store.preview.mapping">
            <ul class="mt-1 flex flex-col gap-1 text-body text-fg">
              <li v-for="line in visibleLines" :key="line" class="break-words">{{ line }}</li>
              <li v-if="hiddenLines" class="text-meta text-fg-muted">e mais {{ countOf(hiddenLines, 'caderno', 'cadernos') }}</li>
            </ul>
            <p v-if="tagText" class="mt-1 text-meta text-fg-muted" data-testid="import-tags">{{ tagText }}</p>
          </template>
          <p v-else class="mt-1 text-body text-fg">Um caderno por baralho raiz, com as matérias e os assuntos dentro.</p>
        </div>

        <div v-if="conflicts.length" class="mt-4 border-t border-hairline pt-4" data-testid="import-conflicts">
          <h3 class="text-meta font-semibold text-fg-strong">Já existem no Baigi</h3>
          <div v-for="deck in conflicts" :key="deck.name" class="mt-2 grid items-center gap-2 sm:grid-cols-2">
            <p class="min-w-0 text-body break-words text-fg">
              {{ deck.name }}
              <span class="text-meta text-fg-muted"> · {{ countOf(deck.cards_count, 'card', 'cards') }}</span>
            </p>
            <UiSelect
              :model-value="store.deckConflicts[deck.name]"
              :options="CONFLICT_OPTIONS"
              :label="`O que fazer com ${deck.name}`"
              hide-label
              @update:model-value="store.deckConflicts[deck.name] = $event as 'import' | 'skip'"
            />
          </div>
        </div>

        <div v-if="openTopic" class="mt-4 border-t border-hairline pt-4">
          <UiRadioGroup v-model="destination" :options="destinationOptions" label="Para onde vão os cards" data-testid="import-destination" />
        </div>

        <p v-if="confirmError" class="mt-4 text-meta text-danger" role="alert" data-testid="import-error">
          {{ confirmError.message }}
          <UiLink v-if="confirmError.next" :to="confirmError.next.to">{{ confirmError.next.label }}</UiLink>
        </p>
      </UiSection>

      <div class="flex flex-wrap justify-end gap-3">
        <UiButton @click="cancel">Cancelar</UiButton>
        <UiButton variant="primary" :loading="confirming" :disabled="!cardsToImport || store.mappingLoading" data-testid="import-confirm" @click="confirmImport">Importar {{ countOf(cardsToImport, 'card', 'cards') }}</UiButton>
      </div>
    </template>

    <!-- 3. Progress -->
    <UiSection v-else-if="running" class="flex flex-col gap-3" aria-live="polite" data-testid="import-progress">
      <h2 class="text-section text-fg-strong">Importando…</h2>
      <p class="text-body text-fg-muted">{{ stepLabel }}</p>
      <UiProgressBar :value="store.status?.progress_percent ?? 0" label="Progresso da importação" />
      <p class="text-meta text-fg-muted tabular-nums">
        <template v-if="store.status?.imported_cards">{{ fmt(store.status.imported_cards) }} de {{ fmt(store.status.total_cards ?? 0) }} cards</template>
        <template v-else>{{ store.status?.progress_percent ?? 0 }}%</template>
      </p>
    </UiSection>

    <!-- 4. Done: the caderno comes by id (root_topic_id) -->
    <UiSection v-else-if="store.status?.status === 'completed'" class="flex flex-col items-center gap-2 text-center" data-testid="import-done">
      <UiBaigiMascot :size="96" state="celebrating" class="mt-6" />
      <h2 class="text-section text-fg-strong">Importação concluída!</h2>
      <p class="text-body text-fg" data-testid="import-done-summary">{{ doneText }}</p>
      <p v-if="doneDetail" class="text-meta text-fg-muted">{{ doneDetail }}</p>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <UiButton v-if="rootId && todayCount" variant="primary" :to="reviewPath(rootId)" data-testid="import-review">Revisar</UiButton>
        <UiButton v-if="rootId" :variant="todayCount ? 'secondary' : 'primary'" :to="cadernoPath(rootId)" data-testid="import-open">Abrir o caderno</UiButton>
        <UiButton v-if="!rootId || manyRoots" :variant="rootId ? 'ghost' : 'primary'" to="/cadernos">Ver cadernos</UiButton>
      </div>
    </UiSection>

    <!-- Failed -->
    <UiSection v-else-if="store.status?.status === 'failed'" role="alert">
      <UiEmptyState title="Erro na importação" :description="store.status.error || 'Não foi possível importar este arquivo.'">
        <template #action>
          <div class="flex flex-wrap justify-center gap-2">
            <UiButton variant="primary" @click="retryImport">Tentar novamente</UiButton>
            <UiButton @click="cancel">Escolher outro arquivo</UiButton>
          </div>
        </template>
      </UiEmptyState>
    </UiSection>

    <!-- Reading the file -->
    <UiSection v-else aria-busy="true" data-testid="import-reading">
      <span class="sr-only" role="status">Lendo o arquivo…</span>
      <UiSkeleton variant="text" :lines="4" />
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// Importar do Anki (prd-4b-caderno-v3 RF-F17): the preview says how the decks become cadernos ("Caderno: Inglês ·
// Matérias: Vocabulary, Grammar · 14 caminhos mais fundos e 230 etiquetas viram etiquetas") and, when the import
// began from a caderno (?topic_id=), starts inside it (decision of the owner, RF-F17) and lets the person choose
// "Caderno novo"; without topic_id there is nothing to choose: caderno novo. The end
// opens the caderno by root_topic_id. Works only online: chunk once-*.
import { Upload } from 'lucide-vue-next'
import type { RadioOption } from '~/components/ui/RadioGroup.vue'
import type { AnkiDestinationType } from '~/types'
import { PREVIEW_TIMEOUT_MESSAGE } from '~/stores/import'
import { cadernoLines, tagsLine } from '~/utils/ankiMapping'
import { countOf, organizationError, type OrganizationErrorView } from '~/utils/organization'
import { reviewPath, scopeQuery } from '~/utils/reviewScope'

useHead({ title: 'Importar do Anki · Baigi' })

const CONFLICT_OPTIONS = [{ value: 'import', label: 'Importar mesmo assim' }, { value: 'skip', label: 'Pular este baralho' }]
const MAX_CADERNOS = 5
const fmt = (n: number) => n.toLocaleString('pt-BR')

const route = useRoute()
const store = useImportStore()
const topicStore = useTopicStore()
const { $api } = useNuxtApp()
const { track } = useAnalytics()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const confirming = ref(false)
const confirmError = ref<OrganizationErrorView | null>(null)
/** Why the last file could not be read (upload 422 or preview failed), shown in the drop area. */
const fileError = ref<string | null>(null)

// The caderno the import began from: only offered once the tree knows it (not someone else's, not in the trash)
const topicId = computed(() => (typeof route.query.topic_id === 'string' && route.query.topic_id) || null)
const openTopic = computed(() => (topicId.value ? topicStore.findById(topicId.value) : null))
const back = computed(() => (openTopic.value ? { to: cadernoPath(openTopic.value.id), label: openTopic.value.name } : { to: '/cadernos', label: 'Cadernos' }))

const destination = ref<AnkiDestinationType>('new')
const destinationOptions = computed<RadioOption[]>(() => {
  const t = openTopic.value
  if (!t) return []
  const depth = topicStore.rootOf(t.id)?.id === t.id ? 0 : (t.parent_id && topicStore.rootOf(t.id)?.id === t.parent_id ? 1 : 2)
  return [
    // A live caderno with the name of the deck is reused by the job (only one in the trash is not): the words say so
    { value: 'new', label: 'Caderno novo', description: 'Um por baralho raiz. Se já existir um caderno com o mesmo nome, os cards entram nele.' },
    {
      value: 'existing',
      label: `Dentro de ${t.name}`,
      description: depth === 0 ? 'Os baralhos viram matérias deste caderno' : depth === 1 ? 'Os baralhos viram assuntos desta matéria' : 'Os cards ficam neste assunto e os baralhos viram etiquetas',
    },
  ]
})
// Only once the tree knows the caderno, so a topic_id of someone else or in the trash falls back to "Caderno novo"
const defaultDestination = (): AnkiDestinationType => (openTopic.value ? 'existing' : 'new')
// The mapping says what each destination would make
watch(destination, (d) => { void store.fetchMapping(d === 'existing' ? topicId.value : null) })

const noteTypes = computed(() => {
  const t = store.preview?.note_types
  if (!t) return ''
  return [
    t.Basic ? `Pergunta e resposta: ${fmt(t.Basic)}` : '',
    t.Cloze ? `Lacuna: ${fmt(t.Cloze)}` : '',
    t.Other ? `Outros: ${fmt(t.Other)}` : '',
  ].filter(Boolean).join(' · ')
})
const lines = computed(() => (store.preview?.mapping ? cadernoLines(store.preview.mapping) : []))
const visibleLines = computed(() => lines.value.slice(0, MAX_CADERNOS))
const hiddenLines = computed(() => Math.max(0, lines.value.length - MAX_CADERNOS))
const tagText = computed(() => (store.preview?.mapping ? tagsLine(store.preview.mapping) : ''))
const conflicts = computed(() => (store.preview?.decks ?? []).filter(d => d.conflict))
// The button says what will come: a deck marked "Pular" does not
const cardsToImport = computed(() => {
  const skipped = conflicts.value.filter(d => store.deckConflicts[d.name] === 'skip').reduce((n, d) => n + d.cards_count, 0)
  return Math.max(0, (store.preview?.total_cards ?? 0) - skipped)
})

const running = computed(() => store.status?.status === 'processing' || store.status?.status === 'confirmed')

// Stops on unmount (component scope) and while the tab is hidden
const statusPoll = usePoll(() => store.pollStatus(), {
  interval: 2000,
  immediate: false,
  until: () => store.status?.status === 'completed' || store.status?.status === 'failed',
})

const stepLabel = computed(() => {
  const map: Record<string, string> = {
    creating_decks: 'Criando os cadernos…',
    creating_topics: 'Criando as matérias e os assuntos…',
    importing_cards: 'Importando os cards…',
    extracting_media: 'Trazendo as mídias…',
  }
  return map[store.status?.current_step ?? ''] ?? 'Processando…'
})

function handleFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void uploadFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) void uploadFile(file)
}

async function uploadFile(file: File) {
  fileError.value = null
  if (!file.name.toLowerCase().endsWith('.apkg')) {
    fileError.value = 'Este arquivo não é um .apkg. No Anki, use Arquivo → Exportar → Pacote de baralho (.apkg).'
    return
  }
  try {
    await store.upload(file)
    await store.fetchPreview(destination.value === 'existing' ? topicId.value : null)
  } catch (e: any) {
    // Stays on the screen (not a toast): the API message says how to export again.
    fileError.value = e?.data?.errors?.file?.[0] || e?.data?.message || (e?.message === PREVIEW_TIMEOUT_MESSAGE ? e.message : 'Não conseguimos ler este arquivo. No Anki, use Arquivo → Exportar → Pacote de baralho (.apkg) e envie de novo.')
    store.reset()
  }
}

async function confirmImport() {
  if (confirming.value) return
  confirming.value = true
  confirmError.value = null
  try {
    const dest = destination.value === 'existing' && topicId.value ? { type: 'existing' as const, topic_id: topicId.value } : { type: 'new' as const }
    await store.confirm(dest)
    track('anki_destination', { type: dest.type })
    statusPoll.start()
  } catch (e) {
    const view = organizationError(e)
    if (view) confirmError.value = view
    else reportApiError(e, { error: 'Não foi possível começar a importação. Tente de novo.' })
  } finally {
    confirming.value = false
  }
}

async function retryImport() {
  try {
    store.status = null
    await store.confirm(destination.value === 'existing' && topicId.value ? { type: 'existing', topic_id: topicId.value } : { type: 'new' })
    statusPoll.start()
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível reprocessar a importação. Tente de novo.' })
  }
}

function cancel() {
  statusPoll.stop()
  store.reset()
  destination.value = defaultDestination()
  confirmError.value = null
}

// === The end: "3.000 cards e os intervalos vieram · 45 para hoje" (the revlog is not imported) ===
const rootId = computed(() => store.status?.root_topic_id ?? null)
const manyRoots = computed(() => (store.status?.root_topic_ids?.length ?? 0) > 1)
const todayCount = ref(0)
watch(rootId, async (id) => {
  if (!id) return
  try {
    const res = await $api<{ data: { session_count: number } }>(`/review/session-count?${scopeQuery({ type: 'topic', id })}`)
    todayCount.value = res.data.session_count
  } catch (e) {
    // The end still opens the caderno; only the number is missing
    reportApiError(e, { silent: true })
  }
  void topicStore.fetchTree()
})
const doneText = computed(() => {
  const cards = countOf(store.status?.stats?.cards_created ?? 0, 'card', 'cards')
  const today = todayCount.value ? ` · ${fmt(todayCount.value)} para hoje` : ''
  return `${cards} e os intervalos vieram${today}`
})
const doneDetail = computed(() => {
  const s = store.status?.stats
  if (!s) return ''
  return [
    s.topics_created ? countOf(s.topics_created, 'caderno ou matéria criada', 'cadernos e matérias criados') : '',
    s.media_extracted ? countOf(s.media_extracted, 'mídia', 'mídias') : '',
  ].filter(Boolean).join(' · ')
})

onMounted(async () => {
  store.reset()
  if (!topicId.value) return
  if (!topicStore.tree.length) await topicStore.fetchTree()
  destination.value = defaultDestination()
})
</script>
