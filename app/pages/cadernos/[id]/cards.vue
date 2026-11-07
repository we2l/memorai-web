<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-gutter pt-4 md:pt-8" :class="lib.selected.value.size ? 'pb-40' : 'pb-12'">
    <UiPageHeader title="Todos os cards" :meta="meta" :back="{ to: hubPath, label: scopeName || 'Caderno' }">
      <template #actions>
        <UiButton variant="primary" :icon-left="Plus" data-testid="library-create" @click="openCreateCard">Criar card</UiButton>
        <UiButton :icon-left="ClipboardX" data-testid="library-paste-question" @click="pasteQuestion.show('library', id)">Colar questão</UiButton>
        <UiButton :icon-left="Camera" :loading="photo.reading.value" :disabled="aiUsage.atLimit('cards_ai')" @click="photoInput?.click()">Foto</UiButton>
        <input ref="photoInput" type="file" accept="image/*" capture="environment" class="hidden" aria-label="Foto do material" @change="onPhoto">
      </template>
    </UiPageHeader>
    <!-- Foto → cards uses the paid plan's month of generations (prd-uso-justo RF-F3) -->
    <LazyPlansUsageNotice feature="cards_ai" :usage="aiUsage" class="-mt-3" />

    <!-- The AI's suggestions from a photo -->
    <LazyTopicAiGeneratedCards
      v-if="photo.cards.value.length"
      :cards="photo.cards.value"
      @accept="photo.accept"
      @accept-all="photo.acceptAll"
      @edit="editPhotoCard"
      @discard="photo.discard"
    />

    <CardsCardFilters
      v-if="scopeHasCards || filtered"
      :filters="lib.filters.value"
      :materials="materialOptions"
      :tags="tags"
      @change="onFilter"
      @clear="onClear"
    />

    <UiErrorState v-if="lib.failed.value" title="Não foi possível carregar os cards" @retry="lib.load" />

    <div v-else-if="lib.loading.value && !lib.cards.value.length" aria-busy="true" class="flex flex-col gap-2">
      <span class="sr-only" role="status">Carregando os cards…</span>
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>

    <template v-else-if="lib.cards.value.length">
      <p class="-mb-3 text-meta text-fg-muted" data-testid="library-count" aria-live="polite">{{ countText }}</p>
      <UiSection flush class="overflow-hidden" :aria-busy="lib.loading.value ? 'true' : undefined">
        <CardsCardList
          :cards="lib.cards.value"
          :selected="lib.selected.value"
          :has-more="!!lib.nextCursor.value"
          :loading-more="lib.loadingMore.value"
          :load-more="lib.loadMore"
          @toggle="lib.toggle"
          @open="openCard"
        />
      </UiSection>
    </template>

    <UiEmptyState v-else-if="filtered" title="Nenhum card com esses filtros" description="Mude a busca ou os filtros para ver outros cards." data-testid="library-empty-filter">
      <template #action>
        <UiButton @click="onClear">Limpar filtros</UiButton>
      </template>
    </UiEmptyState>

    <UiEmptyState v-else title="Nenhum card ainda" description="Crie à mão ou gere a partir de um material deste caderno." mascot="thinking" data-testid="library-empty">
      <template #action>
        <div class="flex flex-wrap justify-center gap-2">
          <UiButton :icon-left="Plus" @click="openCreateCard">Criar card</UiButton>
          <UiButton variant="ghost" :to="hubPath">Gerar de um material</UiButton>
        </div>
      </template>
    </UiEmptyState>

    <CardsCardSelectionBar
      v-if="lib.selected.value.size"
      :count="lib.selected.value.size"
      :all-selected="lib.allSelected.value"
      :review-to="lib.reviewSelectionPath.value"
      @toggle-all="lib.toggleAll"
      @review="track('library_bulk', { action: 'review', count: lib.selected.value.size })"
      @move="openMove"
      @delete="showBulkDelete = true"
      @clear="lib.clearSelection"
    />

    <LazyCadernoMoveDialog v-if="moveLoaded" v-model="moveOpen" :item="moveItem" @moved="onMoved" />

    <LazyCardsCardDialog v-if="dialogLoaded" v-model="dialogOpen" :card="openedCard" :topic-id="id" @edit="openEditCard" @delete="askDelete" />

    <LazyFlashcardCardFormModal
      v-if="cardFormLoaded"
      v-model="showCardForm"
      :topic-id="id"
      :card="editingCard"
      :initial-front="cardFormFront"
      :initial-back="cardFormBack"
      :local-only="editingPhotoIndex !== null"
      @created="onCreated"
      @updated="onUpdated"
      @local-save="onLocalSave"
    />
    <UiConfirmModal
      v-model="showDeleteCard"
      title="Excluir card?"
      message="O card será removido permanentemente."
      confirm-label="Excluir"
      @confirm="deleteOne"
    />
    <UiConfirmModal
      v-model="showBulkDelete"
      :title="`Excluir ${lib.selected.value.size} ${lib.selected.value.size === 1 ? 'card' : 'cards'}?`"
      message="Eles serão removidos permanentemente, com o histórico de revisão."
      :confirm-label="`Excluir ${lib.selected.value.size}`"
      @confirm="deleteSelected"
    />
  </div>
</template>

<script setup lang="ts">
// The card library of a scope (prd-4c-material-v3 RF-F9..F12): every card of the caderno, matéria or
// assunto, filtered on the server (state, origin, errors, tag, search) with the filters in the URL, in
// pages of 50 by cursor, light rows (content-visibility) and a selection that reviews or deletes many at
// once. "+ Criar card" is the primary (also in the language mode, D11); "Foto" is the OCR of today. The AI
// generation lives on each material's panel (the old "Preparar revisão" of the whole scope left, F4).
// ?origin=note:<id> ("Ver os N cards" of the material) and the old ?source_note_id= open filtered;
// ?highlight=<id> (search) opens that card; ?new=1 opens the form.
import { Camera, ClipboardX, Plus } from 'lucide-vue-next'
import type { SelectOption } from '~/components/ui/Select.vue'
import type { LibraryCard, MaterialsPage } from '~/types'
import type { LibraryFilters } from '~/composables/useCardLibrary'
import type { MoveItem } from '~/utils/moveTargets'
import { hasFilters } from '~/composables/useCardLibrary'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const scopeStore = useScopeStore()
const toast = useToast()
const { track } = useAnalytics()

const id = computed(() => String(route.params.id))
const topicRef = computed<string | null>(() => id.value)
const lib = useCardLibrary(id)
// "Colar questão" (prd-questao-errada RF-F3): the new cards show up on the list
const pasteQuestion = usePasteQuestion()
watch(pasteQuestion.created, () => { void lib.load() })
const photo = usePhotoCards(topicRef, async () => { await lib.load() })

const hubPath = computed(() => cadernoPath(id.value))
const scopeName = computed(() => (scopeStore.topicId === id.value ? scopeStore.summary?.topic.name : null) ?? topicStore.findById(id.value)?.name ?? '')
const filtered = computed(() => hasFilters(lib.filters.value))
/** Cards in the whole scope (the 1st unfiltered page); unknown while a filtered URL opened first */
const scopeTotal = ref<number | null>(null)
const scopeHasCards = computed(() => (scopeTotal.value ?? 0) > 0 || lib.cards.value.length > 0)

watch([() => lib.total.value, filtered], ([total, f]) => { if (!f && total !== null) scopeTotal.value = total })

const meta = computed(() => {
  const n = scopeTotal.value
  if (n === null) return scopeName.value || undefined
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'card' : 'cards'}${scopeName.value ? ` em ${scopeName.value}` : ''}`
})
const countText = computed(() => {
  const n = lib.total.value ?? lib.cards.value.length
  const shown = lib.cards.value.length
  const what = `${n.toLocaleString('pt-BR')} ${n === 1 ? 'card' : 'cards'}${filtered.value ? ' com esses filtros' : ''}`
  return shown < n ? `${what} · mostrando ${shown}` : what
})

// === Filters ===
function onFilter(patch: Partial<LibraryFilters>, filter: 'q' | 'state' | 'origin' | 'errors' | 'tag' | 'sort') {
  lib.setFilters(patch)
  track('library_filter', { filter })
}
function onClear() {
  lib.clearFilters()
  track('library_filter', { filter: 'clear' })
}

// Origin options: the materials of the scope (the first 50, by most recent)
const materialOptions = ref<SelectOption[]>([])
async function loadMaterials() {
  try {
    const res = await $api<MaterialsPage>(`/topics/${id.value}/materials`, { query: { limit: 50 } })
    materialOptions.value = res.data
      .filter(r => r.cards > 0)
      .map(r => ({ value: r.kind === 'pdf' ? `document:${r.id}` : `note:${r.id}`, label: r.title }))
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}
// Tags of the cards already loaded (an import from Anki brings them); the filter only shows with some
const tags = computed(() => [...new Set(lib.cards.value.flatMap(c => c.tags ?? []))].slice(0, 30))

// === Card dialog, form and deletes ===
const dialogOpen = ref(false)
const dialogLoaded = useLoadedOnce(() => dialogOpen.value)
const openedCard = ref<LibraryCard | null>(null)
function openCard(card: LibraryCard) {
  openedCard.value = card
  dialogOpen.value = true
}

const showCardForm = ref(false)
const cardFormLoaded = useLoadedOnce(() => showCardForm.value)
const cardFormFront = ref('')
const cardFormBack = ref('')
const editingCard = ref<LibraryCard | null>(null)
const editingPhotoIndex = ref<number | null>(null)

function openCreateCard() {
  cardFormFront.value = ''
  cardFormBack.value = ''
  editingPhotoIndex.value = null
  editingCard.value = null
  showCardForm.value = true
}
function openEditCard(card: LibraryCard) {
  dialogOpen.value = false
  editingCard.value = card
  editingPhotoIndex.value = null
  showCardForm.value = true
}
function editPhotoCard(index: number) {
  const card = photo.cards.value[index]
  if (!card) return
  cardFormFront.value = card.front ?? ''
  cardFormBack.value = card.back ?? ''
  editingCard.value = null
  editingPhotoIndex.value = index
  showCardForm.value = true
}
function onLocalSave(card: { front: string; back: string; frontAudioBlob: Blob | null; backAudioBlob: Blob | null }) {
  if (editingPhotoIndex.value === null) return
  photo.saveLocal(editingPhotoIndex.value, card)
  editingPhotoIndex.value = null
}
async function onCreated() {
  await lib.load()
  void topicStore.fetchTree()
}
function onUpdated(card?: { id: string; front: string; back: string }) {
  if (card) lib.replaceCard(card)
}

const showDeleteCard = ref(false)
const deleting = ref<LibraryCard | null>(null)
function askDelete(card: LibraryCard) {
  dialogOpen.value = false
  deleting.value = card
  showDeleteCard.value = true
}
async function deleteOne() {
  const card = deleting.value
  showDeleteCard.value = false
  if (!card) return
  try {
    await $api(`/flashcards/${card.id}`, { method: 'DELETE' })
    lib.removeCard(card.id)
    if (scopeTotal.value) scopeTotal.value--
    toast.show('Card excluído.', 'success')
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível excluir o card.' })
  }
}

const showBulkDelete = ref(false)
async function deleteSelected() {
  showBulkDelete.value = false
  const count = lib.selected.value.size
  try {
    const deleted = await lib.deleteSelected()
    if (scopeTotal.value !== null) scopeTotal.value = Math.max(0, scopeTotal.value - deleted)
    track('library_bulk', { action: 'delete', count })
    toast.show(`${deleted} ${deleted === 1 ? 'card excluído' : 'cards excluídos'}.`, 'success')
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível excluir os cards.' })
  }
}

// === Mover para… (prd-4b-caderno-v3 RF-F15): the selected cards, with their history and origin ===
const moveOpen = ref(false)
const moveLoaded = useLoadedOnce(() => moveOpen.value)
const moveItem = ref<MoveItem | null>(null)
function openMove() {
  const ids = [...lib.selected.value]
  if (!ids.length) return
  const chosen = new Set(ids)
  const topicIds = [...new Set(lib.cards.value.filter(c => chosen.has(c.id)).map(c => c.topic_id).filter((t): t is string => !!t))]
  moveItem.value = { kind: 'cards', ids, topicIds }
  moveOpen.value = true
}
function onMoved() {
  // They may have left this scope, or stayed in a subject of it: the list and its total come again
  void lib.load()
}

// === Photo (OCR) ===
const photoInput = ref<HTMLInputElement | null>(null)
// The paid plan's month of generations (prd-uso-justo RF-F3): /usage once per opening, only for the paid plan
const aiUsage = usePaidQuota()
function readPhoto(file: File) {
  if (aiUsage.atLimit('cards_ai')) {
    window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: aiUsage.limitDetail('cards_ai') }))
    return
  }
  void photo.processImage(file)
}
async function onPhoto(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) readPhoto(file)
  input.value = ''
}

// "+ Adicionar → Foto" of this scope: the OCR of the library
const addIntent = useAddIntent()
function consumePhoto() {
  const next = addIntent.value
  if (!next || next.kind !== 'photo' || next.topicId !== id.value || !next.file) return
  addIntent.value = null
  readPhoto(next.file)
}
watch(addIntent, consumePhoto)

/** ?highlight=<id> (search): opens that card, wherever it is in the list. */
async function openHighlighted(cardId: string) {
  const known = lib.cards.value.find(c => c.id === cardId)
  if (known) return openCard(known)
  try {
    const res = await $api<{ data: LibraryCard }>(`/flashcards/${cardId}`)
    openCard(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

onMounted(async () => {
  if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree()
  void loadMaterials()
  await Promise.all([lib.load(), aiUsage.fetchUsageIfPaid()])
  consumePhoto()
  const { new: isNew, highlight, ...query } = route.query
  if (isNew === '1') openCreateCard()
  if (typeof highlight === 'string') void openHighlighted(highlight)
  if (isNew !== undefined || highlight !== undefined) void router.replace({ query })
})

watch(id, () => { scopeTotal.value = null; void loadMaterials() })

useHead(() => ({ title: `Cards de ${scopeName.value || 'caderno'} · Baigi` }))
</script>
