<template>
  <div class="flex flex-col" :class="desktop ? 'pb-12' : 'pb-36'">
    <!-- The note is gone (deleted, or someone else's) -->
    <UiErrorState
      v-if="m.missing.value || material.missing.value"
      variant="page"
      title="Este material não existe mais"
      description="Ele pode ter sido excluído ou movido."
    >
      <template #actions>
        <UiButton variant="primary" :to="back.to">{{ back.label }}</UiButton>
      </template>
    </UiErrorState>

    <template v-else>
      <!-- Top: the way back, the path, the autosave, Editar and ⋯ -->
      <header class="sticky top-0 z-sticky border-b border-line bg-raised md:top-topnav" data-testid="material-top">
        <div class="mx-auto flex min-h-14 max-w-reading flex-wrap items-center gap-x-3 gap-y-1 px-gutter py-2">
          <UiLink :to="back.to" variant="muted" class="inline-flex shrink-0 items-center gap-1 font-medium" :aria-label="back.aria" data-testid="material-back">
            <ChevronLeft class="size-4" aria-hidden="true" />{{ back.label }}
          </UiLink>
          <nav aria-label="Caminho" class="hidden min-w-0 flex-1 items-center gap-1 text-meta text-fg-muted sm:flex">
            <template v-for="(p, i) in crumbs" :key="p.id">
              <NuxtLink :to="cadernoPath(p.id)" class="max-w-40 truncate hover:text-fg-strong">{{ p.name }}</NuxtLink>
              <ChevronRight v-if="i < crumbs.length" class="size-3 shrink-0" aria-hidden="true" />
            </template>
            <span class="truncate font-semibold text-fg-strong" aria-current="page">{{ m.noteTitle.value || 'Sem título' }}</span>
            <span v-if="partText" class="shrink-0">· {{ partText }}</span>
          </nav>
          <span class="ml-auto flex items-center gap-1 sm:ml-0">
            <span v-if="m.saveState.value === 'error'" role="alert" class="inline-flex items-center gap-1 text-label font-medium text-danger">
              Não salvo
              <button type="button" class="min-h-touch px-1 underline underline-offset-2" @click="m.retrySaveNow">Tentar de novo</button>
            </span>
            <span v-else-if="editing" class="text-label text-fg-muted" data-testid="material-save-state">{{ m.saveState.value === 'saving' ? 'Salvando...' : 'Salvo' }}</span>
            <UiMenu v-if="mid && outlineItems.length" :items="outlineItems" align="start">
              <template #trigger="{ props: trigger }">
                <UiButton size="sm" variant="ghost" :icon-right="ChevronDown" v-bind="trigger">Partes e sumário</UiButton>
              </template>
            </UiMenu>
            <UiButton
              size="sm"
              :icon-left="editing ? Check : Pencil"
              :disabled="!canEdit"
              :aria-keyshortcuts="'E'"
              data-testid="material-mode"
              @click="toggleMode"
            >
              {{ editing ? 'Concluir edição' : 'Editar' }}
            </UiButton>
            <UiMenu :items="menuItems" label="Mais opções do material" />
          </span>
        </div>
      </header>

      <div
        class="mx-auto grid w-full max-w-reading gap-8 px-gutter pt-8"
        :class="wide ? 'grid-cols-[240px_minmax(0,1fr)_340px]' : desktop ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'"
      >
        <!-- Partes e sumário (desktop ≥ 1280) -->
        <aside v-if="wide" class="sticky top-[calc(var(--topnav-h)+5rem)] max-h-[calc(100dvh-var(--topnav-h)-6rem)] self-start overflow-y-auto">
          <MaterialOutline
            :parts="parts"
            :pages="material.context.value?.document?.pages"
            :current-note-id="noteId"
            :topic-id="id"
            :headings="headings"
            :active="outline.active.value"
            @go="goToHeading"
          />
        </aside>

        <!-- Loading the context and the text: the reader's place is kept -->
        <div v-if="!m.editingNote.value" class="min-w-0" aria-busy="true">
          <span class="sr-only" role="status">Carregando o material…</span>
          <UiSkeleton variant="text" :lines="2" />
          <UiSkeleton variant="text" :lines="8" class="mt-8" />
        </div>
        <MaterialReader
          v-else
          ref="reader"
          :title="m.noteTitle.value"
          :content="m.noteContent.value"
          :editing="editing"
          :editable="editable"
          :loading="m.noteLoading.value"
          :topic-id="id"
          :page-links="isPdf"
          :word-count="wordCount"
          :draft-saved-at="m.pendingDraft.value?.savedAt ?? null"
          :generating-text="generatingText"
          :mobile="!desktop"
          @update:title="m.noteTitle.value = $event"
          @save-title="m.saveTitle"
          @edit="m.debouncedSave"
          @open-page="openPdf"
          @selection="onSelection"
          @navigate-topic="(t: string) => navigateTo(cadernoPath(t))"
          @restore-draft="m.restoreDraft"
          @discard-draft="m.discardDraft"
          @ready="observeOutline"
        >
          <template v-if="material.context.value?.document" #source>
            <MaterialSourceLine
              :document-name="material.context.value.document.name"
              :page-start="currentPart?.page_start"
              :page-end="currentPart?.page_end"
              @open-pdf="openPdf"
            />
          </template>
          <template #notices>
            <div v-if="generationFailed" class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-row bg-danger-subtle px-4 py-3" role="alert">
              <p class="min-w-0 flex-1 text-meta text-fg-strong">Não deu para ler o PDF.</p>
              <UiButton size="sm" :loading="regenerating" @click="regenerate">Tentar de novo</UiButton>
            </div>
            <TopicMaterialPdfPanel
              v-else-if="m.document.value && !m.generating.value"
              :doc="m.document.value"
              :topic-id="id"
              :topic-learning-mode="learningMode"
              @changed="m.loadDocument(m.document.value?.id)"
            />
          </template>
          <template #improve-bar>
            <TopicNoteImproveBar
              :visible="m.improve.state.value === 'loading' || m.improve.state.value === 'preview'"
              :state="m.improve.state.value"
              @apply="m.applyImprove"
              @discard="m.discardImprove"
            />
          </template>
        </MaterialReader>

        <!-- Cards desta parte (desktop ≥ 1024) -->
        <aside v-if="desktop" class="sticky top-[calc(var(--topnav-h)+5rem)] max-h-[calc(100dvh-var(--topnav-h)-6rem)] self-start overflow-y-auto pb-2" aria-label="Cards do material">
          <template v-if="material.context.value">
            <MaterialCardsPanel
              :context="material.context.value"
              :cards="material.cards.value"
              :topic-id="id"
              :note-id="noteId"
              :workshop="workshopOpen"
              :busy="m.workshop.state.value === 'loading'"
              :primary="primary"
              @generate="generateCards"
              @create-card="openCardForm"
              @review="(n: number) => track('panel_review', { count: n })"
            >
              <template #workshop>
                <LazyTopicCardWorkshop v-bind="workshopBindings" panel v-on="workshopListeners">
                  <template #post-save-actions>
                    <UiButton variant="primary" block :to="reviewPath({ type: 'note', id: noteId })">Revisar agora</UiButton>
                    <UiButton block @click="m.workshop.reset()">Ver os cards</UiButton>
                  </template>
                </LazyTopicCardWorkshop>
              </template>
            </MaterialCardsPanel>
          </template>
          <UiSkeleton v-else variant="block" size="lg" />
        </aside>
      </div>

      <!-- Phone: the reader alone, with Sumário and Cards in sheets and the primary at hand -->
      <div
        v-if="!desktop && !keyboardOpen && m.editingNote.value"
        class="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--miniplayer-h))] z-sticky flex items-center gap-2 border-t border-line bg-raised px-gutter py-3"
        data-testid="material-bar"
      >
        <UiButton v-if="outlineItems.length" variant="ghost" :icon-left="ListTree" @click="outlineSheet = true">Sumário</UiButton>
        <UiButton :icon-left="Layers" data-testid="material-bar-cards" @click="cardsSheet = true">Cards ({{ material.context.value?.cards.total ?? 0 }})</UiButton>
        <UiButton
          v-if="primary === 'review'"
          variant="primary"
          class="ml-auto"
          :to="reviewPath({ type: 'note', id: noteId })"
          @click="track('panel_review', { count: sessionCount })"
        >
          Revisar {{ sessionCount }}
        </UiButton>
        <UiButton v-else-if="primary === 'generate'" variant="primary" class="ml-auto" :icon-left="Sparkles" @click="generateCards">Gerar cards</UiButton>
      </div>
      <UiSheet v-if="!desktop" v-model="outlineSheet" title="Sumário">
        <MaterialOutline
          :parts="parts"
          :pages="material.context.value?.document?.pages"
          :current-note-id="noteId"
          :topic-id="id"
          :headings="headings"
          :active="outline.active.value"
          @go="(h: OutlineHeading) => { outlineSheet = false; goToHeading(h) }"
        />
      </UiSheet>
      <UiSheet v-if="!desktop" v-model="cardsSheet" :title="cardsSheetTitle" size="lg">
        <MaterialCardsPanel
          v-if="material.context.value"
          :context="material.context.value"
          :cards="material.cards.value"
          :topic-id="id"
          :note-id="noteId"
          :workshop="workshopOpen"
          :busy="m.workshop.state.value === 'loading'"
          :primary="primary"
          in-sheet
          @generate="generateCards"
          @create-card="openCardForm"
          @review="(n: number) => track('panel_review', { count: n })"
        >
          <template #workshop>
            <LazyTopicCardWorkshop v-bind="workshopBindings" panel v-on="workshopListeners">
              <template #post-save-actions>
                <UiButton variant="primary" block :to="reviewPath({ type: 'note', id: noteId })">Revisar agora</UiButton>
                <UiButton block @click="m.workshop.reset()">Ver os cards</UiButton>
              </template>
            </LazyTopicCardWorkshop>
          </template>
        </MaterialCardsPanel>
      </UiSheet>
    </template>

    <LazyTopicNoteToCardModal
      v-if="noteToCardLoaded"
      v-model="showNoteToCard"
      :note-id="noteId"
      :selected-text="selectedText"
      @created="material.reload"
    />
    <LazyFlashcardCardFormModal
      v-if="cardFormLoaded"
      v-model="showCardForm"
      :topic-id="noteTopicId"
      :card="null"
      initial-front=""
      initial-back=""
      :source-note-id="noteId"
      @created="material.reload"
    />
    <LazyTopicNoteMindMapModal v-if="mindMapLoaded" v-model="showMindMap" :note-id="noteId" :note-title="m.noteTitle.value" />
    <LazyTopicPdfViewer
      v-if="pdfLoaded"
      v-model="pdfOpen"
      :url="pdfUrl"
      :filename="material.context.value?.document?.name ?? 'PDF'"
      :topic-id="noteTopicId"
      :note-id="noteId"
      :page="pdfPage"
    />
    <UiConfirmModal
      v-model="showDeleteNote"
      title="Excluir nota?"
      message="A nota será removida permanentemente. Os cards que vieram dela continuam na biblioteca."
      confirm-label="Excluir"
      @confirm="deleteNote"
    />
  </div>
</template>

<script setup lang="ts">
// The material (prd-4c-material-v3 §3.2, RF-F1..F8): the place to study a note or a part of a PDF.
// Three columns on the desktop (≥ 1280: parts and outline · the text · "Cards desta parte"); from 1024 to
// 1279 the outline goes to a menu of the top bar; on the phone only the text, with Sumário and Cards in
// sheets and the primary in the bottom bar. A PDF note opens for reading, a manual note for editing
// ("Editar"/"Concluir edição", E; the choice is kept per note on the device). The panel's workshop keeps
// the text on screen; a selected excerpt can become a card, 3 cards with AI or a question. "(pág. X)" in
// the text and "Ver no PDF" open the PDF on that page. ?from=review shows "‹ Voltar à revisão";
// ?workshop=1 (the hub's "Gerar cards") starts the workshop once.
import { Check, ChevronDown, ChevronLeft, ChevronRight, Layers, ListTree, Pencil, Sparkles } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { SelectionAction } from '~/components/material/SelectionActions.vue'
import { outlineOf, type OutlineHeading } from '~/composables/useNoteOutline'
import { reviewPath } from '~/utils/reviewScope'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const topicStore = useTopicStore()
const scopeStore = useScopeStore()
const noteStore = useNoteStore()
const { track } = useAnalytics()
const { run } = useApiAction()

const id = computed(() => String(route.params.id))
const noteId = computed(() => String(route.params.noteId))
const material = useMaterial(noteId)
const m = useMaterialEditor(id, noteId, () => material.reload())

const desktop = useMediaQuery('(min-width: 1024px)')
const wide = useMediaQuery('(min-width: 1280px)')
const mid = computed(() => desktop.value && !wide.value)

// === Where "‹" goes: back to the review session (?from=review), else the scope ===
const scopeName = computed(() => (scopeStore.topicId === id.value ? scopeStore.summary?.topic.name : null) ?? topicStore.findById(id.value)?.name ?? material.context.value?.path.at(-1)?.name ?? '')
const back = computed(() => {
  if (route.query.from === 'review') {
    const target = typeof route.query.back === 'string' && route.query.back.startsWith('/revisar') ? route.query.back : '/revisar'
    return { to: target, label: 'Voltar à revisão', aria: 'Voltar à revisão' }
  }
  const label = scopeName.value || 'Caderno'
  return { to: cadernoPath(id.value), label, aria: `Voltar a ${label}` }
})
const learningMode = computed(() => {
  if (scopeStore.topicId === id.value && scopeStore.summary) return scopeStore.summary.topic.learning_mode
  return topicStore.rootOf(id.value)?.learning_mode ?? null
})

// === Context: the path, the parts, the numbers ===
const crumbs = computed(() => material.context.value?.path ?? [])
const parts = computed(() => material.context.value?.parts ?? [])
const currentPart = computed(() => parts.value.find(p => p.note_id === noteId.value) ?? null)
const partText = computed(() => (currentPart.value && parts.value.length > 1 ? `parte ${currentPart.value.index} de ${parts.value.length}` : ''))
const isPdf = computed(() => !!(m.editingNote.value?.source_document_id ?? material.context.value?.document))
const noteTopicId = computed(() => material.context.value?.note.topic_id ?? m.editingNote.value?.topic_id ?? id.value)
const wordCount = computed(() => (noteStore.current?.id === noteId.value ? noteStore.current.word_count : null) ?? material.context.value?.note.word_count ?? 0)
const sessionCount = computed(() => material.context.value?.cards.session_count ?? 0)
const cardsSheetTitle = computed(() => `Cards ${material.context.value?.note.kind === 'part' ? 'desta parte' : 'desta nota'}`)

// One primary per screen (RF-F8): review what is due; else generate when there is no card; else none
const primary = computed<'review' | 'generate' | null>(() => {
  const c = material.context.value
  if (!c || workshopOpen.value) return null
  if (c.cards.session_count > 0) return 'review'
  if (!c.cards.total && c.can_generate.ok) return 'generate'
  return null
})

// === The PDF still writing the note, or failed ===
const generatingText = computed(() => {
  const doc = m.document.value
  if (!m.generating.value || !doc) return ''
  const total = doc.note_total_batches ?? 0
  const done = Math.min(total, Math.round((doc.note_generation_progress ?? 0) * (total || 1) / 100))
  return total ? `Escrevendo a nota · lote ${Math.min(total, done + 1)} de ${total}` : 'Escrevendo a nota…'
})
const generationFailed = computed(() => m.document.value?.note_generation_status === 'failed')
const regenerating = ref(false)
async function regenerate() {
  const doc = m.document.value
  if (!doc) return
  regenerating.value = true
  const ok = await run(() => $api(`/documents/${doc.id}/regenerate-note`, { method: 'POST' }), { success: 'Lendo o PDF de novo.', error: 'Não foi possível tentar de novo agora.' })
  regenerating.value = false
  if (ok !== undefined) await m.loadDocument(doc.id)
}

// === Reading or editing (RF-F2): PDF → reading, manual → editing; the choice kept per note ===
const editing = ref(false)
const MODE_KEY = (note: string) => `baigi-material-mode-${note}`
function readMode(note: string, pdf: boolean): boolean {
  try {
    const saved = localStorage.getItem(MODE_KEY(note))
    if (saved === 'edit' || saved === 'read') return saved === 'edit'
  } catch { /* intencional: localStorage bloqueado (modo privado); vale o padrão pelo tipo */ }
  return !pdf
}
const canEdit = computed(() => !m.generating.value && !m.noteLoading.value && !!m.editingNote.value)
const editable = computed(() => editing.value && canEdit.value && m.improve.state.value !== 'loading' && m.improve.state.value !== 'preview' && !m.pendingDraft.value)

function toggleMode() {
  if (!canEdit.value) return
  editing.value = !editing.value
  if (!editing.value) m.flushPendingSave()
  try { localStorage.setItem(MODE_KEY(noteId.value), editing.value ? 'edit' : 'read') } catch { /* intencional: localStorage bloqueado; a troca vale só nesta visita */ }
  track('material_mode', { mode: editing.value ? 'edit' : 'read' })
}

// E toggles the mode (outside a field or the editor)
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'e' && e.key !== 'E') return
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
  const t = e.target as HTMLElement | null
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
  if (document.querySelector('[aria-modal="true"]')) return
  e.preventDefault()
  toggleMode()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// === Outline: the headings of the open note, from the JSON (no request) ===
const reader = ref<{ textRoot: HTMLElement | null } | null>(null)
const readerRoot = computed(() => reader.value?.textRoot ?? null)
const outline = useNoteOutline(readerRoot)
const headings = computed(() => outlineOf(m.noteContent.value))
function observeOutline() {
  void nextTick(() => outline.observe())
}
watch(() => headings.value.length, observeOutline)
function goToHeading(h: OutlineHeading) {
  outline.goTo(h.index)
  track('outline_click', { level: h.level })
}
const outlineItems = computed<MenuItem[]>(() => [
  ...parts.value.map(p => ({ label: `${p.index} · ${p.title}`, to: cadernoPath(id.value, { note: p.note_id }), meta: p.note_id === noteId.value ? 'aberta' : undefined })),
  ...headings.value.map((h, i) => ({ label: `${'  '.repeat(h.level - 1)}${h.text}`, onSelect: () => goToHeading(h), separator: i === 0 && parts.value.length > 0 })),
])

// === Workshop of the panel (the whole note or a selection) ===
const workshopOpen = computed(() => ['workshop', 'loading', 'success'].includes(m.workshop.state.value))
const workshopBindings = computed(() => ({
  cards: m.workshop.cards.value,
  loading: m.workshop.state.value === 'loading',
  acceptedIndexes: m.workshop.acceptedIndexes.value,
  showSuccess: m.workshop.state.value === 'success',
  savedCount: m.workshop.savedCount.value,
  saving: m.workshop.saving.value,
}))
const workshopListeners = {
  'save': () => m.workshop.saveAll(),
  'discard': () => m.workshop.discardAll(),
  'edit-card': (i: number, data: { front: string; back: string }) => m.workshop.editCard(i, data),
  'remove-card': (i: number) => m.workshop.removeCard(i),
  'accept-card': (i: number) => m.workshop.acceptCard(i),
}
function generateCards() {
  if (!desktop.value) cardsSheet.value = true
  m.generateCards()
}

// === Selection: card, 3 cards with AI, tira-dúvidas (RF-F5) ===
const selectedText = ref('')
const showNoteToCard = ref(false)
const noteToCardLoaded = useLoadedOnce(() => showNoteToCard.value)
function onSelection(action: SelectionAction, text: string) {
  track('selection_action', { action })
  if (action === 'card') {
    selectedText.value = text
    showNoteToCard.value = true
  } else if (action === 'ai3') {
    if (!desktop.value) cardsSheet.value = true
    m.generateFromSelection(text)
  } else {
    m.askAboutSelection(text)
  }
}

// "Criar card" without a selection: the form, the note as its origin
const showCardForm = ref(false)
const cardFormLoaded = useLoadedOnce(() => showCardForm.value)
function openCardForm() {
  showCardForm.value = true
}

// === Sheets of the phone; the bar hides while the keyboard is open ===
const outlineSheet = ref(false)
const cardsSheet = ref(false)
const keyboardOpen = ref(false)
function onViewport() {
  const vv = window.visualViewport
  keyboardOpen.value = !!vv && window.innerHeight - vv.height > 150
}
onMounted(() => window.visualViewport?.addEventListener('resize', onViewport))
onBeforeUnmount(() => window.visualViewport?.removeEventListener('resize', onViewport))
useStickyActionHeight(computed(() => !desktop.value && !keyboardOpen.value && !!m.editingNote.value))

// === The PDF on a page (RF-F6) ===
const pdfOpen = ref(false)
const pdfLoaded = useLoadedOnce(() => pdfOpen.value)
const pdfUrl = ref('')
const pdfPage = ref<number | null>(null)
async function openPdf(page: number | null) {
  const docId = material.context.value?.document?.id ?? m.editingNote.value?.source_document_id
  if (!docId) return
  track('pdf_page_open', { page })
  try {
    // Short-lived signed URL (15 min, RN-05): asked on every open
    const res = await $api<{ data: { url: string } }>(`/documents/${docId}/file-url`)
    pdfUrl.value = res.data.url
    pdfPage.value = page
    pdfOpen.value = true
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível abrir o PDF.' })
  }
}

// === ⋯ of the top bar ===
const showMindMap = ref(false)
const mindMapLoaded = useLoadedOnce(() => showMindMap.value)
const showDeleteNote = ref(false)
const menuItems = computed<MenuItem[]>(() => [
  { label: 'Melhorar com IA', icon: Sparkles, onSelect: () => m.improveNote(), disabled: !canEdit.value },
  { label: 'Mapa da nota', onSelect: () => { showMindMap.value = true } },
  { label: 'Perguntar sobre este material', onSelect: askAboutMaterial },
  ...(isPdf.value ? [{ label: 'Ver o PDF', onSelect: () => { void openPdf(null) } }] : []),
  { label: 'Excluir nota', tone: 'danger' as const, separator: true, onSelect: () => { showDeleteNote.value = true } },
])
function askAboutMaterial() {
  useChatStore().ask({
    topicId: noteTopicId.value,
    documentId: material.context.value?.document?.id ?? undefined,
    source: 'note_help',
  }, `Tenho uma dúvida sobre o material "${m.noteTitle.value || 'sem título'}": `)
}
async function deleteNote() {
  showDeleteNote.value = false
  const target = noteId.value
  await m.handleDeleteNote()
  scopeStore.removeRow('note', target)
  await navigateTo(cadernoPath(id.value), { replace: true })
}

// "Melhorar com IA" from the menu also leaves reading: the preview replaces the text
watch(() => m.improve.state.value, (s) => { if (s === 'loading') editing.value = true })

useHead(() => ({ title: `${m.noteTitle.value || 'Material'} · Baigi` }))

// === Opening a note (route change included) ===
watch(noteId, async (note) => {
  m.workshop.reset()
  material.reset()
  editing.value = false
  void material.load()
  await m.open()
  if (note !== noteId.value || m.missing.value) return
  editing.value = readMode(note, !!m.editingNote.value?.source_document_id)
  if (route.query.workshop === '1') {
    const { workshop: _w, ...query } = route.query
    void router.replace({ query })
    generateCards()
  }
}, { immediate: true })

let openedTracked = ''
watch(() => material.context.value, (c) => {
  if (!c || openedTracked === c.note.id) return
  openedTracked = c.note.id
  track('material_open', { kind: c.note.kind, parts: c.parts.length })
})

onMounted(() => { if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree() })
</script>
