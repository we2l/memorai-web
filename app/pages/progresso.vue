<template>
  <div class="mx-auto flex max-w-page flex-col gap-6 px-gutter pt-2 pb-6 md:pt-8">
    <UiPageHeader title="Progresso" meta="Onde você está forte, onde precisa de reforço e como chega na prova.">
      <template #actions>
        <UiSelect v-model="scope" :options="scopeOptions" label="Escopo" hide-label class="w-60" data-testid="progress-scope" />
        <UiButton v-if="primary" variant="primary" :to="primary.to" data-testid="progress-primary">{{ primary.label }}</UiButton>
      </template>
    </UiPageHeader>

    <!-- A new account: one block, no zeros (03 §4 e, M10) -->
    <UiSection v-if="noCards" data-testid="progress-new">
      <div class="flex flex-col items-center gap-5 px-2 py-6 text-center">
        <div class="w-full max-w-sm rounded-card bg-raised p-4 text-left shadow-1" aria-hidden="true">
          <p class="text-label text-fg-muted">Prévia</p>
          <div class="mt-2 flex items-baseline gap-2"><span class="text-page-title text-fg-strong">62%</span><span class="text-meta text-fg-muted">de domínio · ▲ +6 em 30 dias</span></div>
          <div class="mt-3 flex flex-col gap-2 text-meta">
            <div class="flex items-center gap-2"><span class="w-28 text-fg">Português</span><span class="h-1.25 flex-1 overflow-hidden rounded-full bg-progress-track"><span class="block h-1.25 w-3/5 rounded-full bg-action" /></span></div>
            <div class="flex items-center gap-2"><span class="w-28 text-fg">Constitucional</span><span class="h-1.25 flex-1 overflow-hidden rounded-full bg-progress-track"><span class="block h-1.25 w-2/5 rounded-full bg-action" /></span></div>
          </div>
        </div>
        <div>
          <h2 class="text-section text-fg-strong">Seu progresso aparece aqui</h2>
          <p class="mt-1 max-w-sm text-body text-fg-muted">Crie seus primeiros cards e revise: o domínio, o acerto e a sequência começam a contar.</p>
        </div>
        <UiButton variant="primary" to="/cadernos">Crie seus primeiros cards</UiButton>
      </div>
    </UiSection>

    <template v-else>
      <div v-if="summaryState === 'loading'" class="grid grid-cols-2 gap-6 lg:grid-cols-4" aria-busy="true"><UiSkeleton v-for="i in 4" :key="i" variant="block" size="sm" /></div>
      <UiErrorState v-else-if="summaryState === 'error'" title="Não foi possível carregar o resumo" @retry="retryFailed" />
      <ProgressSummary v-else-if="summary" :data="summary" :scope-name="scopeName" />
    </template>

    <!-- E2 (ADR-035 §9): the subjects and the days in the main column; the exam card (lilac) and the agenda on the side -->
    <UiSplit side-label="Provas">
      <template #side>
        <LazyProgressExamCard v-if="examsState !== 'loading' && examsState !== 'error'" :exams="examStore.exams" />
        <div v-if="examsState === 'loading'" aria-busy="true"><UiSkeleton variant="block" /></div>
        <UiErrorState v-else-if="examsState === 'error'" title="Não foi possível carregar suas provas" @retry="retryFailed" />
        <ProgressExamList
          v-else
          :exams="examStore.exams"
          :limit-reached="limitReached"
          :saving-outcome="savingOutcome"
          @create="openExam(null)"
          @edit="openExam"
          @delete="askDelete"
          @reta="toggleReta"
          @ics="exportIcs"
          @google="exportGoogle"
          @outcome="answerOutcome"
        />
      </template>

      <template v-if="!noCards">
        <div v-if="perfState === 'loading'" aria-busy="true"><UiSkeleton variant="block" size="lg" /></div>
        <UiErrorState v-else-if="perfState === 'error'" title="Não foi possível carregar o desempenho" @retry="retryFailed" />
        <ProgressPerformanceTable v-else :rows="scopedRows" :root-id="scope || null" @train="train" />

        <div v-if="historyState === 'loading'" aria-busy="true"><UiSkeleton variant="block" /></div>
        <UiErrorState v-else-if="historyState === 'error'" title="Não foi possível carregar o histórico" @retry="retryFailed" />
        <ProgressStudyHeatmap v-else-if="history" :history="history" @open="day = $event" />
      </template>
    </UiSplit>

    <LazyProgressStudyDayPanel v-if="dayLoaded" :date="day" @close="day = null" />
    <LazyExamDialog v-if="examLoaded" v-model="examOpen" :exam="editing" :topic-ids="dialogTopicIds" origin="progress" @saved="onSaved" />
    <LazyQuizConfigSheet v-if="quizLoaded" v-model="quizOpen" :topic-id="quizTopic" :quantity="20" @created="onQuizCreated" />
    <LazyUiConfirmModal
      v-if="confirmLoaded"
      v-model="confirmOpen"
      title="Excluir a prova?"
      :message="toDelete ? `“${toDelete.title}” sai da agenda. Os cadernos e os cards continuam.` : ''"
      confirm-label="Excluir"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
// Progresso (prd-4f-progresso-v3 RF-F1..F8, canvas ProgressoV2): the scope (all cadernos or one; ?caderno=, the
// caderno of the nearest exam by default), the summary, the agenda of exams with pace and projection, the
// performance by matéria and assunto and the history of 26 weeks with the day panel. One primary ("Revisar para
// a prova · N" or "Revisar hoje · N"); E2: the nearest exam with a projection is the one lilac block. 5 requests: /stats/progress, /exams, /topics/performance,
// /stats/history and /stats; each section loads and fails on its own.
import type { Exam, ExamOutcome, ProgressSummaryData, Quiz, Stats, StudyHistory, TopicPerformance } from '~/types'
import { reviewPath } from '~/utils/reviewScope'

useHead({ title: 'Progresso · Baigi' })

type Load = 'loading' | 'error' | 'ready'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const examStore = useExamStore()
const auth = useAuthStore()

// Scope: '' = all cadernos. Without ?caderno= the caderno of the nearest exam, once the agenda is known.
const scope = ref(typeof route.query.caderno === 'string' ? route.query.caderno : '')
let scopeChosen = typeof route.query.caderno === 'string'
let autoScope = false
watch(scope, (id) => {
  if (autoScope) autoScope = false
  else {
    scopeChosen = true
    void router.replace({ query: { ...route.query, caderno: id || undefined }, hash: route.hash })
    useAnalytics().track('progress_scope', { scope: id ? 'notebook' : 'all' })
  }
  void loadSummary()
})

const performance = ref<TopicPerformance[]>([])
const roots = computed(() => performance.value.filter(r => r.depth === 0))
const scopeOptions = computed(() => [{ value: '', label: 'Todos os cadernos' }, ...roots.value.map(r => ({ value: r.topic_id, label: r.name }))])
const scopeName = computed(() => (scope.value ? roots.value.find(r => r.topic_id === scope.value)?.name ?? null : null))
const rootOf = (topicId: string) => {
  const byId = new Map(performance.value.map(r => [r.topic_id, r]))
  let row = byId.get(topicId)
  while (row?.parent_id && byId.has(row.parent_id)) row = byId.get(row.parent_id)
  return row?.topic_id ?? null
}

// Summary
const summary = ref<ProgressSummaryData | null>(null)
const summaryState = ref<Load>('loading')
let summarySeq = 0
async function loadSummary() {
  const n = ++summarySeq
  summaryState.value = 'loading'
  try {
    const res = await $api<{ data: ProgressSummaryData }>('/stats/progress', { params: scope.value ? { root_id: scope.value } : {} })
    if (n !== summarySeq) return
    summary.value = res.data
    summaryState.value = 'ready'
  } catch (e) {
    if (n !== summarySeq) return
    summaryState.value = 'error'
    reportApiError(e, { silent: true })
  }
}

// Exams
const examsState = ref<Load>('loading')
async function loadExams() {
  examsState.value = 'loading'
  try {
    await examStore.fetchAgenda('all')
    examsState.value = 'ready'
    // /progresso#provas (Hoje, the caderno, the old /provas): the agenda once it is drawn
    if (route.hash === '#provas') nextTick(() => document.getElementById('provas')?.scrollIntoView({ block: 'start' }))
  } catch (e) {
    examsState.value = 'error'
    reportApiError(e, { silent: true })
  }
}
const futureExams = computed(() => examStore.exams.filter(e => !e.is_past))
const isFree = computed(() => auth.user?.plan === 'free')
const limitReached = computed(() => isFree.value && futureExams.value.length >= 2)
const nextExam = computed(() => [...futureExams.value].sort((a, b) => a.days_remaining - b.days_remaining)[0] ?? null)
const nextExamRoot = computed(() => {
  const first = nextExam.value?.coverage?.[0]?.topic_id ?? nextExam.value?.topics[0]?.id
  return first ? rootOf(first) : null
})
// The default scope: the caderno of the nearest exam (RF-F1), when the person did not choose one. The summary
// waits for it (one request, not two)
function applyDefaultScope() {
  const id = nextExamRoot.value
  if (!scopeChosen && id && scope.value !== id) {
    autoScope = true
    scope.value = id
    return true
  }
  return false
}

// Performance and the review count of the scope
const perfState = ref<Load>('loading')
async function loadPerformance() {
  perfState.value = 'loading'
  try {
    performance.value = (await $api<{ data: TopicPerformance[] }>('/topics/performance')).data
    perfState.value = 'ready'
  } catch (e) {
    perfState.value = 'error'
    reportApiError(e, { silent: true })
  }
}
const scopedRows = computed(() => {
  if (!scope.value) return performance.value
  const keep = new Set([scope.value])
  for (const r of performance.value) if (r.parent_id && keep.has(r.parent_id)) keep.add(r.topic_id)
  return performance.value.filter(r => keep.has(r.topic_id))
})

const stats = ref<Stats | null>(null)
const noCards = computed(() => perfState.value === 'ready' && stats.value !== null && stats.value.total_cards === 0 && roots.value.every(r => r.cards === 0))

/** The one primary: the session of the exam's caderno (it has the boost of the coverage), else of the scope */
const primary = computed(() => {
  if (noCards.value) return null
  const examRoot = nextExamRoot.value
  if (examRoot) {
    const n = performance.value.find(r => r.topic_id === examRoot)?.session_count ?? 0
    if (n > 0) return { label: `Revisar para a prova · ${n}`, to: reviewPath(examRoot) }
  }
  const n = scope.value ? (performance.value.find(r => r.topic_id === scope.value)?.session_count ?? 0) : (stats.value?.due_today ?? 0)
  return n > 0 ? { label: `Revisar hoje · ${n}`, to: scope.value ? reviewPath(scope.value) : '/revisar' } : null
})

// History
const history = ref<StudyHistory | null>(null)
const historyState = ref<Load>('loading')
async function loadHistory() {
  historyState.value = 'loading'
  try {
    history.value = (await $api<{ data: StudyHistory }>('/stats/history', { params: { days: 182 } })).data
    historyState.value = 'ready'
  } catch (e) {
    historyState.value = 'error'
    reportApiError(e, { silent: true })
  }
}
const day = ref<string | null>(null)
const dayLoaded = useLoadedOnce(() => !!day.value)

// Exam dialog (?nova_prova=1, the old /provas?nova=1)
const examOpen = ref(route.query.nova_prova === '1' || route.query.nova === '1')
const examLoaded = useLoadedOnce(() => examOpen.value)
const editing = ref<Exam | null>(null)
// "Cadastrar nova prova" of the public result (?from={exam}): the same coverage as that exam
const fromExam = typeof route.query.from === 'string' ? route.query.from : null
const dialogTopicIds = computed(() => {
  const from = fromExam ? examStore.exams.find(e => e.id === fromExam) : null
  if (from) return from.coverage?.map(c => c.topic_id) ?? from.topics.map(t => t.id)
  return scope.value ? [scope.value] : undefined
})
function openExam(exam: Exam | null) {
  editing.value = exam
  examOpen.value = true
}
function onSaved() {
  void loadExams()
  void loadSummary()
  if (route.query.nova_prova || route.query.nova) void router.replace({ query: { ...route.query, nova_prova: undefined, nova: undefined, from: undefined }, hash: '#provas' })
}

const toDelete = ref<Exam | null>(null)
const confirmOpen = ref(false)
const confirmLoaded = useLoadedOnce(() => confirmOpen.value)
const { run: runDelete, pending: deleting } = useApiAction()
function askDelete(exam: Exam) {
  toDelete.value = exam
  confirmOpen.value = true
}
async function confirmDelete() {
  if (!toDelete.value) return
  await runDelete(() => examStore.deleteExam(toDelete.value!.id), { success: 'Prova excluída.', error: 'Não foi possível excluir a prova.' })
  confirmOpen.value = false
  toDelete.value = null
}

const { run } = useApiAction()
function toggleReta(exam: Exam) {
  void run(() => examStore.toggleRetaFinal(exam.id), {
    success: exam.reta_final_enabled ? 'Reta final desligada.' : 'Reta final ligada.',
    error: 'Não foi possível mudar a Reta final.',
  })
}
async function exportIcs(exam: Exam) {
  const ok = await run(() => downloadExamIcs(exam).then(() => true), { error: 'Não foi possível baixar o arquivo da agenda.' })
  if (ok) useAnalytics().track('exam_export', { kind: 'ics' })
}
async function exportGoogle(exam: Exam) {
  // The tab opens before the await: a popup after it would be blocked
  const tab = window.open('', '_blank')
  const url = await run(() => examCalendarLink(exam.id), { error: 'Não foi possível abrir o Google Agenda.' })
  if (!url) return tab?.close()
  if (tab) tab.location.href = url
  else window.location.href = url
  useAnalytics().track('exam_export', { kind: 'google' })
}
const savingOutcome = ref<{ id: string; outcome: ExamOutcome } | null>(null)
async function answerOutcome(exam: Exam, outcome: ExamOutcome) {
  savingOutcome.value = { id: exam.id, outcome }
  await run(() => examStore.recordOutcome(exam.id, outcome), {
    success: outcome === 'passed' ? 'Parabéns pela aprovação!' : 'Resposta registrada. Bora para a próxima.',
    error: 'Não foi possível salvar sua resposta.',
  })
  savingOutcome.value = null
}

// "Treinar": 20 questions of the weak assunto (the sheet of Praticar)
const quizOpen = ref(false)
const quizLoaded = useLoadedOnce(() => quizOpen.value)
const quizTopic = ref<string | null>(null)
function train(topicId: string) {
  quizTopic.value = topicId
  quizOpen.value = true
}
function onQuizCreated(quiz: Quiz) {
  quizOpen.value = false
  void navigateTo(`/simulados/${quiz.id}`)
}

/** "Tentar de novo" of any section: every section that failed loads again (one tap after a network blip) */
function retryFailed() {
  if (summaryState.value === 'error') void loadSummary()
  if (examsState.value === 'error') void loadExams()
  if (perfState.value === 'error') void loadPerformance()
  if (historyState.value === 'error') void loadHistory()
  if (!stats.value) void loadStats()
}

async function loadStats() {
  try {
    stats.value = (await $api<{ data: Stats }>('/stats')).data
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

onMounted(async () => {
  const lists = Promise.allSettled([loadExams(), loadPerformance()])
  if (scopeChosen) void loadSummary()
  else void lists.then(() => { if (!applyDefaultScope()) void loadSummary() })
  void loadHistory()
  void loadStats()
})
</script>
