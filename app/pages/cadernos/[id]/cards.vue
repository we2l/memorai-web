<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-2 pt-2 pb-6 md:pt-8">
    <div class="px-gutter">
      <UiPageHeader :title="title" :meta="meta" :back="{ to: hubPath, label: scopeName || 'Caderno' }" />
    </div>

    <UiErrorState v-if="loadError" class="mx-gutter" title="Não foi possível carregar os cards" @retry="load" />

    <template v-else>
      <!-- Card Workshop ("Preparar revisão"), above the list -->
      <div v-if="workshop.state.value !== 'idle'" class="px-4 pt-4">
        <LazyTopicCardWorkshop
          :cards="workshop.cards.value"
          :loading="workshop.state.value === 'loading'"
          :accepted-indexes="workshop.acceptedIndexes.value"
          :show-success="workshop.state.value === 'success'"
          :saved-count="workshop.savedCount.value"
          :saving="workshop.saving.value"
          @save="workshop.saveAll()"
          @discard="workshop.discardAll()"
          @edit-card="workshop.editCard"
          @remove-card="workshop.removeCard"
          @accept-card="workshop.acceptCard"
        >
          <template #post-save-actions>
            <UiButton variant="primary" block :to="reviewPath(id)">Revisar agora</UiButton>
            <UiButton block @click="workshop.reset()">Fechar</UiButton>
          </template>
        </LazyTopicCardWorkshop>
      </div>

      <!-- "Ver e editar cards" of a note or PDF: only its cards (?source_note_id=) -->
      <div v-if="sourceNoteId" class="mx-4 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-subtle px-3 py-2" role="status">
        <p class="min-w-0 flex-1 text-meta text-fg">
          <template v-if="filteredTotal !== null">{{ filteredTotal }} card{{ filteredTotal !== 1 ? 's' : '' }} de </template>
          <template v-else>Cards de </template>
          <span class="font-semibold text-fg-strong">{{ sourceNoteTitle || 'esta nota' }}</span>
        </p>
        <UiButton size="sm" variant="ghost" @click="showAll">Ver todos os cards</UiButton>
      </div>

      <TopicHubCardsTab
        ref="hubCardsRef"
        :topic-id="id"
        :cards="listCards"
        server-mode
        :has-more="hasMorePages"
        :loading-more="loadingPage"
        :generated-cards="photo.cards.value"
        :ai-generating="false"
        :error-patterns="errorPatterns"
        :note-name-by-id="noteNameById"
        :highlight-id="highlightCardId"
        :can-use-ocr="featureUsage.canUse('cards_ai')"
        @create-card="openCreateCard"
        @delete-card="confirmDeleteCard"
        @edit-card="openEditCard"
        @accept-card="photo.accept"
        @accept-all-cards="photo.acceptAll"
        @edit-generated="editPhotoCard"
        @discard-generated="photo.discard"
        @ocr-cards="photo.fromOcr"
        @search="searchCards"
        @load-more="loadNextPage"
      >
        <template #ai-generate>
          <UiButton :icon-left="Sparkles" icon-tone="action" :disabled="workshop.state.value === 'loading'" @click="workshop.generate('notes')">
            Preparar revisão
          </UiButton>
        </template>
      </TopicHubCardsTab>
    </template>

    <LazyFlashcardCardFormModal
      v-if="cardFormLoaded"
      v-model="showCardForm"
      :topic-id="id"
      :card="editingCard"
      :initial-front="cardFormFront"
      :initial-back="cardFormBack"
      :local-only="editingPhotoIndex !== null"
      @created="onCardSaved"
      @updated="onCardSaved"
      @local-save="onLocalSave"
    />
    <UiConfirmModal
      v-model="showDeleteCard"
      title="Excluir card?"
      message="O card será removido permanentemente."
      confirm-label="Excluir"
      @confirm="handleDeleteCard"
    />
  </div>
</template>

<script setup lang="ts">
// All the cards of a scope (prd-4b-caderno-v3 §3.2, tasks 7.3): the old Cards tab moved to its own route,
// without redesign (the 4c puts the filters on the server). ?source_note_id= shows only the cards of one
// note or PDF ("Ver e editar cards"); ?highlight= scrolls to one card (search); ?new=1 opens the form; the
// photo of "+ Adicionar" runs the OCR here. "Preparar revisão" is the card workshop of the scope.
import { Sparkles } from 'lucide-vue-next'
import type { TopicDetails } from '~/types'
import { reviewPath } from '~/utils/reviewScope'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const scopeStore = useScopeStore()
const featureUsage = useFeatureUsage()

const id = computed(() => String(route.params.id))
const topicRef = computed<string | null>(() => id.value)
const { showDeleteCard, totalCards, setSummary, sourceNoteId, filteredTotal, filterByNote, listCards, hasMorePages, loadingPage, loadNextPage, searchCards, confirmDeleteCard, handleDeleteCard } = useTopicCards()
const workshop = useCardWorkshop({ topicId: topicRef, onReload: async () => { await load() } })
const photo = usePhotoCards(topicRef, async () => { await load() })

const hubPath = computed(() => cadernoPath(id.value))
const scopeName = computed(() => (scopeStore.topicId === id.value ? scopeStore.summary?.topic.name : null) ?? topicStore.findById(id.value)?.name ?? '')
const title = computed(() => 'Todos os cards')
const meta = computed(() => (totalCards.value ? `${totalCards.value.toLocaleString('pt-BR')} ${totalCards.value === 1 ? 'card' : 'cards'} em ${scopeName.value}` : scopeName.value || undefined))

const errorPatterns = ref<any>(null)
const loadError = ref(false)
const highlightCardId = ref('')
const sourceNoteTitle = ref('')
const hubCardsRef = ref<{ processImage: (file: File) => Promise<void> } | null>(null)

// The source of each card ("· Resumo 24"): the notes list of the scope, asked once here (never on the hub)
const noteStore = useNoteStore()
function noteNameById(noteId: string): string {
  return noteStore.notes.find(n => n.id === noteId)?.title ?? (noteId === sourceNoteId.value && sourceNoteTitle.value ? sourceNoteTitle.value : 'Nota')
}

async function load() {
  loadError.value = false
  try {
    const [details, patterns] = await Promise.all([
      $api<{ data: TopicDetails }>(`/topics/${id.value}/details`),
      $api<any>(`/topics/${id.value}/error-patterns`),
    ])
    setSummary(details.data)
    errorPatterns.value = patterns.data
    const note = typeof route.query.source_note_id === 'string' ? route.query.source_note_id : null
    await filterByNote(note)
  } catch (e) {
    loadError.value = true
    reportApiError(e, { silent: true })
  }
}

async function loadSourceTitle(noteId: string | null) {
  sourceNoteTitle.value = ''
  if (!noteId) return
  try {
    const res = await $api<{ data: { title: string } }>(`/notes/${noteId}`)
    sourceNoteTitle.value = res.data.title
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

function showAll() {
  const { source_note_id: _s, ...query } = route.query
  void router.replace({ query })
}

watch(() => route.query.source_note_id, (note) => {
  const noteId = typeof note === 'string' ? note : null
  void loadSourceTitle(noteId)
  if (totalCards.value || sourceNoteId.value) void filterByNote(noteId)
})

onMounted(async () => {
  if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree()
  void featureUsage.fetchUsage()
  void loadSourceTitle(typeof route.query.source_note_id === 'string' ? route.query.source_note_id : null)
  await load()
  consumePhoto()
  if (totalCards.value && noteStore.topicId !== id.value) void noteStore.fetchForTopic(id.value)
  if (route.query.new === '1') {
    openCreateCard()
    const { new: _n, ...query } = route.query
    void router.replace({ query })
  }
  // A card from the search: scroll to it and highlight it for 3 s
  if (typeof route.query.highlight === 'string') {
    highlightCardId.value = route.query.highlight
    setTimeout(() => {
      document.getElementById(`card-${highlightCardId.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { highlightCardId.value = '' }, 3000)
    }, 300)
  }
})

// "+ Adicionar → Foto" of this scope: the OCR of the library
const addIntent = useAddIntent()
function consumePhoto() {
  const next = addIntent.value
  if (!next || next.kind !== 'photo' || next.topicId !== id.value || !next.file) return
  addIntent.value = null
  const file = next.file
  if (hubCardsRef.value) return void hubCardsRef.value.processImage(file)
  const stop = watch(hubCardsRef, (tab) => {
    if (!tab) return
    stop()
    void tab.processImage(file)
  })
}
watch(addIntent, consumePhoto)

// Card form: create, edit, or edit a photo card before accepting it
const showCardForm = ref(false)
const cardFormLoaded = useLoadedOnce(() => showCardForm.value)
const cardFormFront = ref('')
const cardFormBack = ref('')
const editingCard = ref<any>(null)
const editingPhotoIndex = ref<number | null>(null)

function openCreateCard() {
  cardFormFront.value = ''
  cardFormBack.value = ''
  editingPhotoIndex.value = null
  editingCard.value = null
  showCardForm.value = true
}

function openEditCard(card: any) {
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

async function onCardSaved() {
  await load()
  void topicStore.fetchTree()
}

useHead(() => ({ title: `Cards de ${scopeName.value || 'caderno'} · Baigi` }))
</script>
