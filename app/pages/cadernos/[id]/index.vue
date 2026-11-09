<template>
  <div class="mx-auto flex max-w-page flex-col gap-5 px-gutter pt-2 pb-6 md:pt-8" :aria-busy="loading ? 'true' : undefined">
    <!-- 404: the caderno does not exist (or is not the person's) -->
    <LazyUiEmptyState v-if="store.notFound" title="Caderno não encontrado" description="Se você o excluiu, ele fica na lixeira por 30 dias." mascot="subtle">
      <template #action>
        <div class="flex flex-wrap justify-center gap-2">
          <UiButton variant="primary" to="/cadernos">Ver cadernos</UiButton>
          <UiButton to="/cadernos/lixeira">Abrir a lixeira</UiButton>
        </div>
      </template>
    </LazyUiEmptyState>

    <template v-else>
      <!-- Skeleton of the header and of 4 lines (RF-F12) -->
      <template v-if="!summary && !store.summaryError">
        <UiSkeleton variant="text" :lines="2" class="max-w-sm" />
        <div class="rounded-card bg-raised p-6 shadow-1" aria-hidden="true">
          <UiSkeleton v-for="i in 4" :key="i" variant="row" />
        </div>
        <span class="sr-only" role="status">Carregando o caderno…</span>
      </template>
      <UiErrorState v-else-if="!summary" title="Não foi possível carregar o caderno" @retry="store.fetchSummary()" />

      <template v-else>
        <UiSection v-if="celebrating" class="flex flex-col items-center gap-3">
          <LazyUiCelebration kind="goal" :title="`Tudo revisado em ${summary.topic.name}`" subtitle="A sessão de hoje deste escopo acabou." />
          <UiButton variant="ghost" size="sm" @click="celebrating = false">Fechar</UiButton>
        </UiSection>

        <CadernoScopeHeader
          :summary="summary"
          :roots="roots"
          @edit="openEdit"
          @move="moveScope"
          @delete="trashScope"
          @exam="examOpen = true"
        />

        <!-- The onboarding's exam, offered to this caderno of the person's own (prd-revisao-v5-fase-b RF-F12) -->
        <LazyExamMoveOffer
          v-if="summary.exam_offer"
          :exam-id="summary.exam_offer.exam_id"
          :exam-title="summary.exam_offer.title"
          :target="{ topic_id: summary.topic.id, name: summary.topic.name }"
          origin="caderno"
          @moved="store.fetchSummary()"
        />
        <UiSplit side-label="Resumo do caderno">
          <template v-if="hasSide" #side>
            <CadernoScopeStats v-if="!isEmpty" :summary="summary" :first-material="store.materials[0] ?? null" @listen="listen" />
            <CadernoNextStep v-if="showNextStep" :step="summary.next_step!" @go="kind => track('next_step_click', { kind })" />
            <UiSection v-if="summary.exam" aria-label="Prova" data-testid="scope-exam">
              <div class="flex items-center gap-3.5">
                <UiIconTile :icon="CalendarDays" tone="action" />
                <div class="min-w-0">
                  <p class="font-semibold text-fg-strong">{{ summary.exam.title }} · {{ summary.exam.days_remaining === 0 ? 'hoje' : `em ${summary.exam.days_remaining} ${summary.exam.days_remaining === 1 ? 'dia' : 'dias'}` }}</p>
                  <p class="text-meta text-fg-muted">{{ summary.exam.projection ? `Mantendo o ritmo, chega lembrando ${summary.exam.projection.keep_pace}%` : 'A projeção aparece depois de 20 cards revisados' }}</p>
                </div>
              </div>
            </UiSection>
          </template>

          <template v-for="block in blocks" :key="block">
            <LazyCadernoEmptyScope
              v-if="block === 'empty'"
              :topic-id="id"
              :is-root="summary.topic.depth === 0"
              :can-add-subject="!summary.subjects.length && canAddSubtopic(summary.topic.depth)"
              @add-subject="openAddSubject"
              @pdf="(file, auto) => uploadPdf(file, auto)"
              @photo="openPhoto"
              @note="createNote"
            />
            <CadernoSubjectTable
              v-else-if="block === 'subjects'"
              :subjects="summary.subjects"
              :scope-depth="summary.topic.depth"
              :can-add="canAddSubtopic(summary.topic.depth)"
              @add="openAddSubject"
              @open="s => track('subject_open', { depth: s.depth })"
              @move="moveSubject"
              @delete="trashSubject"
            />
            <CadernoMaterialList
              v-else-if="block === 'materials'"
              :scope-id="id"
              :summary="summary"
              :blocked-reasons="blockedReasons"
              @add="addHere"
              @retry="retryNote"
              @delete="trashMaterial"
              @move="moveMaterial"
              @view-pdf="viewPdf"
              @ready="() => store.fetchSummary()"
              @search="track('material_search', {})"
              @more="rows => track('material_load_more', { rows })"
            />
            <CadernoPracticeRow v-else-if="block === 'practice'" :summary="summary" />
          </template>
        </UiSplit>
      </template>
    </template>

    <CadernoReviewBar v-if="showBar" :topic-id="id" :count="summary!.session.count" />

    <LazyExamDialog v-if="examLoaded" v-model="examOpen" :topic-ids="[id]" origin="scope" @saved="onExamSaved" />
    <LazyCadernoTopicDialog v-if="dialogLoaded" v-model="dialogOpen" :mode="dialogMode" :target="dialogTarget" @saved="onTopicSaved" />

    <LazyCadernoMoveDialog v-if="moveLoaded" v-model="moveOpen" :item="moveItem" @moved="onMoved" />
    <LazyCadernoTrashDialog v-if="trashLoaded" v-model="trashOpen" :item="trashItem" @trashed="onTrashed" />

    <LazyTopicGenerateNoteSheet v-if="noteSheetLoaded" v-model="noteSheetOpen" :document="noteSheetDoc" @generated="onNoteGenerating" />
    <LazyTopicPdfViewer v-if="viewerLoaded" v-model="viewerOpen" :url="viewerUrl" :filename="viewerName" :topic-id="id" />
    <LazyPodcastGenerateSheet
      v-if="podcastSheetLoaded"
      v-model="podcastSheetOpen"
      :topic-id="id"
      :topic-name="summary?.topic.name ?? ''"
      @generated="onPodcastGenerated"
    />
  </div>
</template>

<script setup lang="ts">
// Hub of a scope (prd-4b-caderno-v3 RF-F3…RF-F12): the same page for a caderno, a matéria and an assunto,
// organized by the study cycle. Header with ONE number of review, Próximo passo, Matérias e assuntos,
// Materiais and Praticar, in the order of the mode (D11). Opening it asks only the summary and the first
// page of materials, in parallel (§6 rule 6: no note content, no card list). The editor, the card library
// and the map live on their own routes. "+ Adicionar" writes here (RF-F10).
import { CalendarDays } from 'lucide-vue-next'
import type { Document, MaterialRow, Podcast, ScopeSubject } from '~/types'
import type { TopicDialogMode, TopicDialogTarget } from '~/components/caderno/TopicDialog.vue'
import type { TrashItem } from '~/components/caderno/TrashDialog.vue'
import type { MoveItem } from '~/utils/moveTargets'
import { canAddSubtopic, consumeScopeCleared } from '~/utils/scope'
import { readAutoCardsPref } from '~/utils/autoCardsPref'
import { documentRowStatus } from '~/stores/scope'

const route = useRoute()
const store = useScopeStore()
const topicStore = useTopicStore()
const toast = useToast()
const { $api } = useNuxtApp()
const { track } = useAnalytics()

const id = computed(() => String(route.params.id))
const summary = computed(() => (store.topicId === id.value ? store.summary : null))
const loading = computed(() => store.summaryLoading && !summary.value)

const roots = computed(() => topicStore.tree.map(t => ({ id: t.id, name: t.name })))

const hasCards = computed(() => (summary.value?.counts.cards ?? 0) > 0)
// A material just added here (its line is on top) ends the empty state before the summary counts it
const isEmpty = computed(() => !!summary.value && !hasCards.value && summary.value.counts.materials === 0 && !store.materials.length)

/** Blocks in the order of the mode (RF-F8): Matérias before Materiais, except in the faculdade mode. */
const blocks = computed(() => {
  const s = summary.value
  if (!s) return []
  const hasSubjects = s.subjects.length > 0
  if (isEmpty.value) return hasSubjects ? ['subjects', 'empty'] : ['empty']
  // Subjects block: with subjects, or on a caderno with material (only "+ Matéria" and a sentence)
  const showSubjects = hasSubjects || (s.topic.depth === 0 && canAddSubtopic(s.topic.depth))
  const order = s.topic.learning_mode === 'academic' ? ['materials', 'subjects'] : ['subjects', 'materials']
  return [...order.filter(b => b !== 'subjects' || showSubjects), 'practice']
})

// The header already offers "Gerar cards de…" as the primary when there are no cards: no second block for it
const showNextStep = computed(() => {
  const step = summary.value?.next_step
  if (!step) return false
  return !(step.kind === 'generate_cards' && !hasCards.value)
})

const hasSide = computed(() => !!summary.value && (!isEmpty.value || showNextStep.value || !!summary.value.exam))

const showBar = computed(() => (summary.value?.session.count ?? 0) > 0)
useStickyActionHeight(showBar)

// --- Exam of this scope (prd-4f-progresso-v3 RF-F10: "Definir prova" in the ⋯ of the header) -----------
const examOpen = ref(false)
const examLoaded = useLoadedOnce(() => examOpen.value)
function onExamSaved() {
  void load(id.value)
}

// --- Opening ------------------------------------------------------------------------------------------
const celebrating = ref(false)
let trackedOpen: string | null = null

async function load(topicId: string) {
  celebrating.value = false
  await store.open(topicId)
  const s = store.topicId === topicId ? store.summary : null
  if (!s) return
  if (trackedOpen !== topicId) {
    trackedOpen = topicId
    track('scope_open', { depth: s.topic.depth, mode: s.topic.learning_mode })
  }
  // Only the person's own session that emptied this scope celebrates (05/#11), never a switch
  if (s.session.count === 0 && consumeScopeCleared(topicId)) celebrating.value = true
}

// The backlog plan or the new cards changed the numbers (prd-revisao-v5-fase-b RF-F3)
watch(useBacklogPlan().changed, () => { void store.fetchSummary() })
watch(id, (v) => {
  // The tree (caderno switch, edit, delete) comes after the summary: it never competes with the first paint
  void load(v).then(() => { if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree() })
}, { immediate: true })

useHead(() => ({ title: summary.value ? `${summary.value.topic.name} · Baigi` : 'Caderno · Baigi' }))

// --- "+ Adicionar" in the scope (RF-F10) --------------------------------------------------------------
const addSheet = useAddSheet()
const addIntent = useAddIntent()
function addHere() { addSheet.show('scope') }


const upload = useDocumentUpload()
const blockedReasons = ref<Record<string, string>>({})

async function uploadPdf(file: File, autoCards: boolean) {
  const invalid = await upload.validate(file)
  if (invalid) return toast.show(invalid, 'error')
  const topicId = id.value
  const result = await upload.upload(file, { topicId, autoCards, source: 'caderno' })
  if (!result || store.topicId !== topicId) return
  const auto = upload.autoGeneration.value
  const doc = result.document
  if (auto && !auto.dispatched && auto.blocked_reason) blockedReasons.value = { ...blockedReasons.value, [doc.id]: auto.blocked_reason }
  const status = auto?.dispatched ? 'processing' : auto?.blocked_reason ? 'blocked' : documentRowStatus(doc)
  store.prependRow({
    kind: 'pdf', id: doc.id, note_id: doc.note_id ?? null, title: doc.original_name,
    topic: { id: topicId, name: summary.value?.topic.name ?? '' },
    pages: doc.pages_count, parts: null, words: null, cards: 0, mastery: null, session_count: 0, ahead_count: 0,
    status, progress: null, updated_at: new Date().toISOString(),
  })
  void store.fetchSummary()
}

async function createNote() {
  try {
    const note = await useNoteStore().create(id.value, { title: 'Novo material' })
    void topicStore.fetchTree()
    await navigateTo(cadernoPath(id.value, { note: note.id }))
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível criar a nota. Tente de novo.' })
  }
}

function openPhoto(file: File) {
  addIntent.value = { kind: 'photo', topicId: id.value, file }
  void navigateTo(cadernoPath(id.value, { view: 'cards' }))
}

// An intent of "+ Adicionar" for this scope (declared after uploadPdf/createNote: it may run at setup)
watch([addIntent, id], () => {
  const next = addIntent.value
  if (!next || next.topicId !== id.value) return
  if (next.kind === 'photo') return void navigateTo(cadernoPath(id.value, { view: 'cards' }))
  addIntent.value = null
  if (next.kind === 'note') void createNote()
  else if (next.kind === 'pdf' && next.file) void uploadPdf(next.file, next.autoCards ?? readAutoCardsPref())
}, { immediate: true })

// --- Materials: retry, view, delete ------------------------------------------------------------------
const noteSheetOpen = ref(false)
const noteSheetLoaded = useLoadedOnce(() => noteSheetOpen.value)
const noteSheetDoc = ref<Document | null>(null)

async function retryNote(row: MaterialRow) {
  try {
    const res = await $api<{ data: Document }>(`/documents/${row.id}`)
    noteSheetDoc.value = res.data
    noteSheetOpen.value = true
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível abrir o PDF. Tente de novo.' })
  }
}

function onNoteGenerating() {
  const doc = noteSheetDoc.value
  if (!doc) return
  blockedReasons.value = Object.fromEntries(Object.entries(blockedReasons.value).filter(([k]) => k !== doc.id))
  store.patchRow('pdf', doc.id, { status: 'processing', progress: null })
}

const viewerOpen = ref(false)
const viewerLoaded = useLoadedOnce(() => viewerOpen.value)
const viewerUrl = ref('')
const viewerName = ref('')

async function viewPdf(row: MaterialRow) {
  try {
    // Short-lived signed URL (15 min): asked on every open
    const res = await $api<{ data: { url: string } }>(`/documents/${row.id}/file-url`)
    viewerUrl.value = res.data.url
    viewerName.value = row.title
    viewerOpen.value = true
  } catch {
    toast.show('Não foi possível abrir o PDF.', 'error')
  }
}

// --- Organization (prd-4b-caderno-v3 4b-2): "Mover para…" and the trash, for a material, a matéria or this scope --
const moveOpen = ref(false)
const moveLoaded = useLoadedOnce(() => moveOpen.value)
const moveItem = ref<MoveItem | null>(null)
function openMove(item: MoveItem) {
  moveItem.value = item
  moveOpen.value = true
}
function moveMaterial(row: MaterialRow) {
  openMove({ kind: row.kind, id: row.id, name: row.title, topicId: row.topic.id })
}
function moveSubject(s: ScopeSubject) {
  openMove({ kind: 'topic', id: s.id, name: s.name, parentId: s.parent_id })
}
function moveScope() {
  const s = summary.value
  if (s) openMove({ kind: 'topic', id: s.topic.id, name: s.topic.name, parentId: s.topic.parent_id })
}
function onMoved(destination: { id: string | null; name: string }) {
  const item = moveItem.value
  // A matéria takes its materials along, and a filter may change what the row belongs to: all again
  if ((item?.kind !== 'note' && item?.kind !== 'pdf') || store.query.subjectId || !destination.id) {
    void store.refresh()
    return
  }
  // One material: the pages already loaded keep their place (still in this scope, or out of it)
  const stays = destination.id === id.value || summary.value?.subjects.some(s => s.id === destination.id)
  if (stays) store.patchRow(item.kind, item.id, { topic: { id: destination.id, name: destination.name } })
  else store.removeRow(item.kind, item.id)
  void store.fetchSummary()
}

const trashOpen = ref(false)
const trashLoaded = useLoadedOnce(() => trashOpen.value)
const trashItem = ref<TrashItem | null>(null)
function openTrash(item: TrashItem) {
  trashItem.value = item
  trashOpen.value = true
}
function trashMaterial(row: MaterialRow) {
  openTrash({ kind: row.kind, id: row.id, name: row.title, counts: { parts: row.kind === 'pdf' && row.parts && row.parts > 1 ? row.parts : 0, cards: row.cards } })
}
function trashSubject(s: ScopeSubject) {
  openTrash({ kind: 'topic', id: s.id, name: s.name, depth: s.depth })
}
function trashScope() {
  const s = summary.value
  // "Desfazer" comes back here, wherever the person went meanwhile
  if (s) openTrash({ kind: 'topic', id: s.topic.id, name: s.topic.name, depth: s.topic.depth, restoreTo: cadernoPath(s.topic.id) })
}
function onTrashed() {
  const item = trashItem.value
  // The open scope is gone: back to where it was
  if (item?.kind === 'topic' && item.id === id.value) {
    void navigateTo(cadernoPath(summary.value?.path.at(-1)?.id), { replace: true })
  } else if (item?.kind === 'topic') {
    void store.refresh()
  } else if (item) {
    // One material: the pages already loaded keep their place
    store.removeRow(item.kind, item.id)
    void store.fetchSummary()
  }
}

// --- Ouvir: the latest episode of the scope plays in the mini-player; none → generate one ------------
const podcastSheetOpen = ref(false)
const podcastSheetLoaded = useLoadedOnce(() => podcastSheetOpen.value)

async function listen() {
  const ep = summary.value?.listen
  if (!ep) {
    podcastSheetOpen.value = true
    return
  }
  try {
    // The player store loads with the first episode (keeps it out of the hub chunk)
    const [res, { usePlayerStore: player }] = await Promise.all([$api<{ data: Podcast }>(`/podcasts/${ep.id}`), import('~/stores/player')])
    player().play(res.data)
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível tocar o episódio.' })
  }
}

async function onPodcastGenerated() {
  const { usePodcastStore: podcasts } = await import('~/stores/podcast')
  podcasts().startPolling()
}

// --- Topic: add subject, edit, delete ----------------------------------------------------------------
const dialogOpen = ref(false)
const dialogLoaded = useLoadedOnce(() => dialogOpen.value)
const dialogMode = ref<TopicDialogMode>('create')
const dialogTarget = ref<TopicDialogTarget | null>(null)

function openAddSubject() {
  const s = summary.value
  if (!s) return
  dialogMode.value = 'create'
  dialogTarget.value = { id: s.topic.id, name: s.topic.name, depth: s.topic.depth }
  dialogOpen.value = true
}

function openEdit() {
  const s = summary.value
  if (!s) return
  const t = topicStore.findById(s.topic.id)
  dialogMode.value = 'edit'
  dialogTarget.value = {
    id: s.topic.id, name: s.topic.name, depth: s.topic.depth, color: s.topic.color,
    learning_mode: s.topic.depth === 0 ? s.topic.learning_mode : null,
    target_language: t?.target_language ?? null, language_level: t?.language_level ?? null,
    typed_answers: s.topic.depth === 0 ? !!s.topic.typed_answers : undefined,
  }
  dialogOpen.value = true
}

function onTopicSaved() {
  void store.fetchSummary()
}
</script>

