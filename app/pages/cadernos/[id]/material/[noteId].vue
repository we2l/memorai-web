<template>
  <div class="flex flex-col">
    <UiEmptyState v-if="m.missing.value" title="Material não encontrado" description="Ele pode ter sido excluído ou movido." mascot="subtle" class="mt-8">
      <template #action>
        <UiButton variant="primary" :to="hubPath">Voltar a {{ scopeName || 'o caderno' }}</UiButton>
      </template>
    </UiEmptyState>

    <TopicNoteEditorShell
      v-else-if="m.editingNote.value"
      :active-note="m.editingNote.value"
      :note-title="m.noteTitle.value"
      :save-state="m.saveState.value"
      :draft-saved-at="m.pendingDraft.value?.savedAt ?? null"
      :breadcrumb-topic="scopeName"
      :back-to="hubPath"
      :cards-to="cardsPath"
      :note-cards="m.noteCards.value"
      :note-session="m.noteSession.value"
      @generate-from-note="m.generateCards"
      @improve-note="m.improveNote"
      @delete-note="showDeleteNote = true"
      @save-title="m.saveTitle"
      @retry-save="m.retrySaveNow"
      @restore-draft="m.restoreDraft"
      @discard-draft="m.discardDraft"
      @update:note-title="m.noteTitle.value = $event"
    >
      <template #documents>
        <TopicMaterialPdfPanel
          v-if="m.document.value && !m.generating.value"
          :doc="m.document.value"
          :topic-id="id"
          :topic-learning-mode="learningMode"
          @changed="m.loadDocument(m.document.value?.id)"
        />
      </template>
      <template #generating-banner>
        <div v-if="m.generating.value" class="flex items-center gap-3 border-b border-line bg-action-subtle px-6 py-3" role="status">
          <UiSpinner size="sm" />
          <div class="flex-1">
            <p class="text-meta text-fg-strong">Gerando material… O conteúdo aparece conforme fica pronto.</p>
            <p class="text-label text-fg-muted">Edição liberada ao finalizar.</p>
          </div>
        </div>
      </template>
      <template #improve-bar>
        <TopicNoteImproveBar
          :visible="m.improve.state.value === 'loading' || m.improve.state.value === 'preview'"
          :state="m.improve.state.value"
          @apply="m.applyImprove"
          @discard="m.discardImprove"
        />
      </template>
      <template #editor>
        <LazyTopicCardWorkshop
          v-if="workshopOpen"
          :cards="m.workshop.cards.value"
          :loading="m.workshop.state.value === 'loading'"
          :accepted-indexes="m.workshop.acceptedIndexes.value"
          :show-success="m.workshop.state.value === 'success'"
          :saved-count="m.workshop.savedCount.value"
          :saving="m.workshop.saving.value"
          @save="m.workshop.saveAll()"
          @discard="m.workshop.discardAll()"
          @edit-card="m.workshop.editCard"
          @remove-card="m.workshop.removeCard"
          @accept-card="m.workshop.acceptCard"
        >
          <template #post-save-actions>
            <UiButton variant="primary" block :to="reviewPath({ type: 'note', id: noteId })">Revisar agora</UiButton>
            <UiButton block @click="m.workshop.reset()">Voltar à nota</UiButton>
          </template>
        </LazyTopicCardWorkshop>
        <div v-else-if="m.noteLoading.value" class="space-y-3" aria-busy="true">
          <span class="sr-only">Carregando nota...</span>
          <UiSkeleton variant="text" :lines="3" />
        </div>
        <LazyTopicNoteEditor
          v-else
          :model-value="m.noteContent.value"
          :editable="editable"
          :topic-id="id"
          @edit="m.debouncedSave"
          @create-card="openNoteToCard"
          @ask-ai="m.askAboutSelection"
          @navigate-topic="(t: string) => navigateTo(cadernoPath(t))"
        />
      </template>
    </TopicNoteEditorShell>

    <div v-else class="mx-auto w-full max-w-prose px-6 pt-12" aria-busy="true">
      <span class="sr-only" role="status">Carregando o material…</span>
      <UiSkeleton variant="text" :lines="5" />
    </div>

    <LazyTopicNoteToCardModal
      v-if="noteToCardLoaded"
      v-model="showNoteToCard"
      :note-id="noteId"
      :selected-text="m.selectedText.value"
      @created="m.loadCounts"
    />
    <LazyFlashcardCardFormModal
      v-if="cardFormLoaded"
      v-model="showCardForm"
      :topic-id="id"
      :card="null"
      :initial-front="cardFormFront"
      initial-back=""
      @created="m.loadCounts"
    />
    <UiConfirmModal
      v-model="showDeleteNote"
      title="Excluir nota?"
      message="A nota será removida permanentemente. Cards gerados dela não serão afetados."
      confirm-label="Excluir"
      @confirm="deleteNote"
    />
  </div>
</template>

<script setup lang="ts">
// The material open (prd-4b-caderno-v3 §3.2, tasks 7.2): the note (or the part of a PDF) with the editor,
// "Melhorar com IA", the card workshop, the card of the selection, the note's map and its PDF, moved out
// of the hub without redesign (the 4c redesigns it). "‹ {escopo}" goes back to the hub; "Revisar estes N"
// is the note's own session (F2); "Ver e editar os N cards" opens the library filtered by the note.
// ?workshop=1 (the hub's "Gerar cards") starts the workshop once.
import { reviewPath } from '~/utils/reviewScope'

const route = useRoute()
const router = useRouter()
const topicStore = useTopicStore()
const scopeStore = useScopeStore()

const id = computed(() => String(route.params.id))
const noteId = computed(() => String(route.params.noteId))
const m = useMaterialEditor(id, noteId)

const hubPath = computed(() => cadernoPath(id.value))
const cardsPath = computed(() => cadernoPath(id.value, { view: 'cards', sourceNoteId: noteId.value }))
const scopeTopic = computed(() => topicStore.findById(id.value))
const scopeName = computed(() => (scopeStore.topicId === id.value ? scopeStore.summary?.topic.name : null) ?? scopeTopic.value?.name ?? '')
const learningMode = computed(() => {
  if (scopeStore.topicId === id.value && scopeStore.summary) return scopeStore.summary.topic.learning_mode
  return topicStore.rootOf(id.value)?.learning_mode ?? null
})

const workshopOpen = computed(() => ['workshop', 'loading', 'success'].includes(m.workshop.state.value))
const editable = computed(() => !m.generating.value && m.improve.state.value !== 'loading' && m.improve.state.value !== 'preview' && !m.pendingDraft.value)

useHead(() => ({ title: `${m.noteTitle.value || 'Material'} · Baigi` }))

watch(noteId, async () => {
  await m.open()
  if (route.query.workshop === '1') {
    const { workshop: _w, ...query } = route.query
    void router.replace({ query })
    if (!m.missing.value) m.generateCards()
  }
}, { immediate: true })

onMounted(() => { if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree() })

// Card from the editor: the selection becomes a card (NoteToCardModal); without one, the form with the note
const showNoteToCard = ref(false)
const noteToCardLoaded = useLoadedOnce(() => showNoteToCard.value)
const showCardForm = ref(false)
const cardFormLoaded = useLoadedOnce(() => showCardForm.value)
const cardFormFront = ref('')

function openNoteToCard() {
  const current = window.getSelection()?.toString()?.trim() ?? ''
  if (current) {
    m.selectedText.value = current
    showNoteToCard.value = true
  } else {
    cardFormFront.value = document.querySelector('.ProseMirror')?.innerHTML ?? ''
    showCardForm.value = true
  }
}

const showDeleteNote = ref(false)
async function deleteNote() {
  showDeleteNote.value = false
  const target = noteId.value
  await m.handleDeleteNote()
  scopeStore.removeRow('note', target)
  await navigateTo(hubPath.value, { replace: true })
}
</script>
