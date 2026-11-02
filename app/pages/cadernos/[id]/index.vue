<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-4 px-gutter pt-2 pb-6 md:pt-8" :aria-busy="loading ? 'true' : undefined">
    <!-- 404: the caderno does not exist (or is not the person's) -->
    <LazyUiEmptyState v-if="store.notFound" title="Caderno não encontrado" description="Ele pode ter sido excluído." mascot="subtle">
      <template #action>
        <UiButton variant="primary" to="/cadernos">Ver cadernos</UiButton>
      </template>
    </LazyUiEmptyState>

    <template v-else>
      <!-- Skeleton of the header and of 4 lines (RF-F12) -->
      <template v-if="!summary && !store.summaryError">
        <div class="rounded-card bg-raised p-6 shadow-card" aria-hidden="true">
          <UiSkeleton variant="text" :lines="3" />
        </div>
        <div class="rounded-card bg-raised p-6 shadow-card" aria-hidden="true">
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
          :first-material="store.materials[0] ?? null"
          @listen="listen"
          @edit="openEdit"
          @delete="openDelete"
        />

        <CadernoNextStep v-if="showNextStep" :step="summary.next_step!" @go="kind => track('next_step_click', { kind })" />

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
          />
          <CadernoMaterialList
            v-else-if="block === 'materials'"
            :scope-id="id"
            :summary="summary"
            :blocked-reasons="blockedReasons"
            @add="addHere"
            @retry="retryNote"
            @delete="askDeleteMaterial"
            @view-pdf="viewPdf"
            @ready="() => store.fetchSummary()"
            @search="track('material_search', {})"
            @more="rows => track('material_load_more', { rows })"
          />
          <CadernoPracticeRow v-else-if="block === 'practice'" :summary="summary" />
        </template>
      </template>
    </template>

    <CadernoReviewBar v-if="showBar" :topic-id="id" :count="summary!.session.count" />

    <LazyCadernoTopicDialog v-if="dialogLoaded" v-model="dialogOpen" :mode="dialogMode" :target="dialogTarget" @saved="onTopicSaved" />

    <LazyUiConfirmModal
      v-if="deleteTopicLoaded"
      v-model="deleteTopicOpen"
      :title="`Excluir '${summary?.topic.name ?? ''}'?`"
      :message="deleteTopicMessage"
      confirm-label="Excluir"
      :require-text="deleteRequiresName ? summary?.topic.name : undefined"
      @confirm="deleteTopic"
    />
    <LazyUiConfirmModal
      v-if="deleteMaterialLoaded"
      v-model="deleteMaterialOpen"
      :title="materialToDelete?.kind === 'pdf' ? 'Remover PDF?' : 'Excluir nota?'"
      :message="materialToDelete?.kind === 'pdf' ? 'O PDF será removido. Resumos e cards já gerados serão mantidos.' : `&quot;${materialToDelete?.title ?? ''}&quot; será excluída. Os cards criados dela continuam.`"
      :confirm-label="materialToDelete?.kind === 'pdf' ? 'Remover' : 'Excluir'"
      @confirm="deleteMaterial"
    />

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
import type { Document, MaterialRow, Podcast, Topic } from '~/types'
import type { TopicDialogMode, TopicDialogTarget } from '~/components/caderno/TopicDialog.vue'
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

const showBar = computed(() => (summary.value?.session.count ?? 0) > 0)
useStickyActionHeight(showBar)

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

watch(id, (v) => {
  // The tree (caderno switch, edit, delete) comes after the summary: it never competes with the first paint
  void load(v).then(() => { if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree() })
}, { immediate: true })

useHead(() => ({ title: summary.value ? `${summary.value.topic.name} · Baigi` : 'Caderno · Baigi' }))

// A deleted subject is gone from the server after its 10 s: the numbers come again
watch(() => topicStore.pendingDeletes.size, (n, prev) => { if (n < prev) void store.fetchSummary() })

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

const materialToDelete = ref<MaterialRow | null>(null)
const deleteMaterialOpen = ref(false)
const deleteMaterialLoaded = useLoadedOnce(() => deleteMaterialOpen.value)
function askDeleteMaterial(row: MaterialRow) {
  materialToDelete.value = row
  deleteMaterialOpen.value = true
}

async function deleteMaterial() {
  const row = materialToDelete.value
  deleteMaterialOpen.value = false
  if (!row) return
  try {
    await $api(row.kind === 'pdf' ? `/documents/${row.id}` : `/notes/${row.id}`, { method: 'DELETE' })
    store.removeRow(row.kind, row.id)
    toast.show(row.kind === 'pdf' ? 'PDF removido.' : 'Nota excluída.', 'success')
    void store.fetchSummary()
    void topicStore.fetchTree()
  } catch (e) {
    reportApiError(e, { error: row.kind === 'pdf' ? 'Não foi possível remover o PDF.' : 'Não foi possível excluir a nota.' })
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
  }
  dialogOpen.value = true
}

function onTopicSaved() {
  void store.fetchSummary()
}

const deleteTopicOpen = ref(false)
const deleteTopicLoaded = useLoadedOnce(() => deleteTopicOpen.value)
const fmt = (n: number) => n.toLocaleString('pt-BR')
const deleteTopicMessage = computed(() => {
  const c = summary.value?.counts
  if (!c) return ''
  const parts = [
    ...(c.subjects ? [`${fmt(c.subjects)} ${summary.value!.topic.depth === 0 ? (c.subjects === 1 ? 'matéria' : 'matérias') : (c.subjects === 1 ? 'assunto' : 'assuntos')}`] : []),
    `${fmt(c.materials)} ${c.materials === 1 ? 'material' : 'materiais'}`,
    `${fmt(c.cards)} ${c.cards === 1 ? 'card' : 'cards'}`,
  ]
  const last = parts.pop()
  return `${parts.length ? `${parts.join(', ')} e ${last}` : last} serão excluídos. Você terá 10 segundos para desfazer.`
})
// A caderno with ≥ 50 cards asks for its name (RN-UX-08)
const deleteRequiresName = computed(() => summary.value?.topic.depth === 0 && (summary.value?.counts.cards ?? 0) >= 50)

async function openDelete() {
  if (!topicStore.tree.length) await topicStore.fetchTree()
  deleteTopicOpen.value = true
}

/** Optimistic, 10 s with "Desfazer" (until the trash of 4b-2): back to the parent scope or the list. */
function deleteTopic() {
  const s = summary.value
  deleteTopicOpen.value = false
  if (!s) return
  const topic = topicStore.findById(s.topic.id) as Topic | null
  if (!topic) return
  const parent = s.path.at(-1) ?? null
  topicStore.scheduleRemove(topic)
  const deletedId = topic.id
  void navigateTo(cadernoPath(parent?.id), { replace: true })
  toast.show(`"${topic.name}" excluído`, 'success', {
    duration: 10_000,
    action: {
      label: 'Desfazer',
      onClick: () => { if (topicStore.cancelRemove(deletedId)) void navigateTo(cadernoPath(deletedId)) },
    },
  })
}
</script>
