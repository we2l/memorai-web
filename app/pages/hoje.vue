<template>
  <!-- Keyed by the loading state: the content replaces the skeleton instead of pushing it (no layout shift) -->
  <div :key="loading ? 'loading' : 'ready'" class="hoje-page mx-auto flex flex-col gap-5 px-gutter pt-2 pb-6 md:pt-8" :aria-busy="loading ? 'true' : undefined">
    <HomeGreeting :stats="stats" :user-name="auth.user?.name" :minutes="minutes" :loading="loading" :error="statsError" :returning="showBacklog" />

    <!-- E2 (ADR-035 §9): two columns from 1024 px, the main one fluid and a side of 400; on the phone the left one
         comes first (the first action, the goal and the plan), then the exam and the cadernos -->
    <div class="hoje-grid">
      <div class="flex min-w-0 flex-col gap-5">
        <!-- Hoje without cards (B5): one action that leads to the first cards; the first steps become support -->
        <LazyHomeFirstAction v-if="firstAction" :topic="firstAction" :roots-with-material="rootsWithMaterial" />
        <LazyHomeBacklog v-else-if="showBacklog" :backlog="backlogState!" :due-today="stats?.due_today ?? 0" />

        <HomeGoal v-if="!loading && showGoal" :stats="stats!" :history="history" />

        <!-- Account without cards and without material: the first steps take the place of the plan and carry the primary -->
        <LazyHomeChecklist v-if="!loading && noCards" :stats="stats" :roots="roots" :primary="!firstAction" />
        <HomePlan
          v-else-if="!showBacklog"
          :steps="steps"
          :loading="loading"
          :error="statsError"
          :survival-busy="survivalBusy"
          @act="onStep"
          @survival-off="turnSurvivalOff"
          @retry="loadData"
        />

        <LazyHomeChecklist v-if="!loading && !noCards" :stats="stats" :roots="roots" />
      </div>

      <div class="flex min-w-0 flex-col gap-5">
        <HomeExam v-if="!loading" :exams="examStore.upcoming" :performance="performance" :progress="progress" />
        <HomePlan
          v-if="showBacklog && sideSteps.length"
          title="Também para hoje"
          :steps="sideSteps"
          :survival-busy="survivalBusy"
          data-testid="home-also"
          @act="onStep"
          @survival-off="turnSurvivalOff"
        />
        <HomeNotebooks :topics="progress" :loading="loading" :error="progressError" @retry="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Hoje, E2 (prd-visual-e2 Fase 3, ADR-035): the greeting, the goal with the week, the plan of the day as a list of
// modes, the exam as the one lilac block and the cadernos. Three states: with a plan; without cards (B5: one action,
// "Gere os cards de X e faça a 1ª revisão hoje"); and with a backlog (the plan of 3/7/14 days before anything else).
// Nine requests in parallel; the screen renders once they settle, so no block pushes another (CLS).
import type { BacklogStats, PendingAction, RecentNote, Stats, StudyHistory, TopicPerformance, TopicProgress, UserSettings } from '~/types'
import type { DayPlanStep } from '~/composables/useDayPlan'

const auth = useAuthStore()
const examStore = useExamStore()
const podcastStore = usePodcastStore()
const player = usePlayerStore()
const { $api } = useNuxtApp()

const stats = ref<Stats | null>(null)
const backlog = ref<BacklogStats | null>(null)
const progress = ref<TopicProgress[]>([])
const performance = ref<TopicPerformance[]>([])
const survivalMode = ref(false)
const pendingActions = ref<PendingAction[]>([])
const recentNote = ref<RecentNote | null>(null)
const history = ref<StudyHistory | null>(null)

const loading = ref(true)
const statsError = ref(false)
const progressError = ref(false)

const roots = computed(() => progress.value.filter(t => !t.parent_id))
const noCards = computed(() => !statsError.value && (stats.value?.total_cards ?? 0) === 0)

// B5: the subject with the most material and no card yet (a subject before its caderno)
const firstAction = computed(() => {
  if (loading.value || !noCards.value) return null
  return [...progress.value]
    .filter(t => (t.notes_count ?? 0) > 0 && t.flashcards_count === 0)
    .sort((a, b) => Number(!a.parent_id) - Number(!b.parent_id) || (b.notes_count ?? 0) - (a.notes_count ?? 0))[0] ?? null
})
const rootsWithMaterial = computed(() => roots.value.filter(t => (t.notes_count ?? 0) > 0).length)

// The backlog without a plan yet (prd-revisao-v5-fase-b): the card of 3/7/14 days comes first; with a plan, it is a line
const backlogState = computed(() => stats.value?.backlog ?? backlog.value?.backlog ?? null)
const showBacklog = computed(() => !loading.value && !statsError.value && !!backlogState.value?.active && backlogState.value.overdue > 0 && !backlogState.value.plan)

const showGoal = computed(() => !statsError.value && !!stats.value && !noCards.value && (stats.value.goal?.target_batches ?? 0) > 0)

const steps = computed<DayPlanStep[]>(() => (statsError.value || !stats.value
  ? []
  : buildDayPlan({
      stats: stats.value,
      backlog: backlog.value,
      survivalMode: survivalMode.value,
      progress: progress.value,
      performance: performance.value,
      pendingActions: pendingActions.value,
      podcasts: podcastStore.podcasts,
      recentNote: recentNote.value,
      learningMode: auth.user?.default_learning_mode,
    })))
// With the backlog card, the rest of the day goes to the side, without a primary (the card carries it)
const sideSteps = computed(() => steps.value
  .filter(s => !(s.key === 'review' && (stats.value?.due_today ?? 0) <= 0))
  .map(s => ({ ...s, primary: false, backlog: undefined })))
const minutes = computed(() => dayMinutes(steps.value))

let loadSeq = 0

async function loadData() {
  const seq = ++loadSeq
  loading.value = true
  const [statsRes, backlogRes, progressRes, settingsRes, actionsRes, recentRes, podcastsRes, , performanceRes, historyRes] = await Promise.allSettled([
    $api<{ data: Stats }>('/stats'),
    $api<{ data: BacklogStats }>('/review/backlog-stats'),
    $api<{ data: TopicProgress[] }>('/topics/progress'),
    $api<{ data: UserSettings }>('/settings'),
    $api<{ data: PendingAction[] }>('/stats/pending-actions'),
    $api<{ data: RecentNote[] }>('/notes/recent', { params: { limit: 1 } }),
    podcastStore.setScope(null),
    examStore.fetchUpcoming(),
    $api<{ data: TopicPerformance[] }>('/topics/performance'),
    $api<{ data: StudyHistory }>('/stats/history', { params: { days: 7 } }),
  ])
  if (seq !== loadSeq) return

  // The numbers of the day: an error is never "Tudo em dia" nor "Crie seus primeiros cards" (RN-UX-03)
  statsError.value = statsRes.status === 'rejected' || backlogRes.status === 'rejected'
  if (statsRes.status === 'fulfilled') stats.value = statsRes.value.data
  if (backlogRes.status === 'fulfilled') backlog.value = backlogRes.value.data
  for (const r of [statsRes, backlogRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })

  progressError.value = progressRes.status === 'rejected'
  if (progressRes.status === 'fulfilled') progress.value = progressRes.value.data
  else reportApiError(progressRes.reason, { silent: true })

  // Decorative sources: a failure only hides their step (or the week under the goal)
  survivalMode.value = settingsRes.status === 'fulfilled' ? !!settingsRes.value.data.survival_mode : false
  pendingActions.value = actionsRes.status === 'fulfilled' ? actionsRes.value.data : []
  recentNote.value = recentRes.status === 'fulfilled' ? recentRes.value.data[0] ?? null : null
  performance.value = performanceRes.status === 'fulfilled' ? performanceRes.value.data : []
  history.value = historyRes.status === 'fulfilled' ? historyRes.value.data : null
  for (const r of [settingsRes, actionsRes, recentRes, podcastsRes, performanceRes, historyRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })

  loading.value = false
}

function onStep(step: DayPlanStep) {
  useAnalytics().track('home_plan_step_click', { step: step.key, position: steps.value.findIndex(s => s.key === step.key) + 1 })
  if (step.action.podcast) player.play(step.action.podcast)
}

const { run } = useApiAction()
const survivalBusy = ref(false)

async function turnSurvivalOff() {
  survivalBusy.value = true
  const ok = await run(() => $api('/review/survival-mode', { method: 'POST', body: { enabled: false } }), {
    error: 'Não foi possível desligar o modo recuperação.',
  })
  survivalBusy.value = false
  if (ok !== undefined) await loadData()
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

onMounted(async () => {
  loadData()
  if (route.query.email_verificado) {
    await router.replace({ query: {} })
    await auth.fetchMe()
    toast.show('E-mail confirmado!', 'success')
  }
})

watch(() => route.fullPath, () => {
  if (route.path === '/hoje') loadData()
})
// A plan made, cancelled or the new cards back (prd-revisao-v5-fase-b RF-F2): the numbers of the day change
watch(useBacklogPlan().changed, () => loadData())
</script>

<style scoped>
/* E2 (ADR-035 §9): up to 1.240 px, the main column fluid and a side of 400 */
.hoje-page { max-width: 77.5rem; }
.hoje-grid {
  display: grid;
  gap: 1.25rem;
  align-items: start;
}
@media (min-width: 64rem) {
  .hoje-grid { grid-template-columns: minmax(0, 1fr) 25rem; gap: 1.5rem; }
}
</style>
