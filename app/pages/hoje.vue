<template>
  <!-- Keyed by the loading state: the content replaces the skeleton instead of pushing it (no layout shift) -->
  <div :key="loading ? 'loading' : 'ready'" class="mx-auto flex max-w-4xl flex-col gap-4 px-gutter pt-2 pb-6 md:pt-8" :aria-busy="loading ? 'true' : undefined">
    <HomeGreeting :stats="stats" :user-name="auth.user?.name" :minutes="minutes" :loading="loading" :error="statsError" />

    <HomeExam v-if="!loading" :exams="examStore.upcoming" />

    <!-- Account without cards: the first steps take the place of the plan and carry the primary -->
    <HomeChecklist v-if="!loading && noCards" :stats="stats" :roots="roots" primary />
    <HomePlan
      v-else
      :steps="steps"
      :loading="loading"
      :error="statsError"
      :survival-busy="survivalBusy"
      @act="onStep"
      @survival-off="turnSurvivalOff"
      @retry="loadData"
    />

    <HomeNotebooks :topics="progress" :loading="loading" :error="progressError" @retry="loadData" />

    <HomeChecklist v-if="!loading && !noCards" :stats="stats" :roots="roots" />
  </div>
</template>

<script setup lang="ts">
// Hoje v3 (prd-4a-hoje-v3): greeting with the goal and the streak, the next exam, the plan of the day in up
// to 4 steps, the cadernos (roots only) and the first steps of a new account. Eight requests in parallel;
// the screen renders once they settle, so no block pushes another (CLS). Each block has its own error.
import type { BacklogStats, PendingAction, RecentNote, Stats, TopicPerformance, TopicProgress, UserSettings } from '~/types'
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

const loading = ref(true)
const statsError = ref(false)
const progressError = ref(false)

const roots = computed(() => progress.value.filter(t => !t.parent_id))
const noCards = computed(() => !statsError.value && (stats.value?.total_cards ?? 0) === 0)

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
const minutes = computed(() => dayMinutes(steps.value))

let loadSeq = 0

async function loadData() {
  const seq = ++loadSeq
  loading.value = true
  const [statsRes, backlogRes, progressRes, settingsRes, actionsRes, recentRes, podcastsRes, , performanceRes] = await Promise.allSettled([
    $api<{ data: Stats }>('/stats'),
    $api<{ data: BacklogStats }>('/review/backlog-stats'),
    $api<{ data: TopicProgress[] }>('/topics/progress'),
    $api<{ data: UserSettings }>('/settings'),
    $api<{ data: PendingAction[] }>('/stats/pending-actions'),
    $api<{ data: RecentNote[] }>('/notes/recent', { params: { limit: 1 } }),
    podcastStore.setScope(null),
    examStore.fetchUpcoming(),
    $api<{ data: TopicPerformance[] }>('/topics/performance'),
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

  // Decorative sources: a failure only hides their step
  survivalMode.value = settingsRes.status === 'fulfilled' ? !!settingsRes.value.data.survival_mode : false
  pendingActions.value = actionsRes.status === 'fulfilled' ? actionsRes.value.data : []
  recentNote.value = recentRes.status === 'fulfilled' ? recentRes.value.data[0] ?? null : null
  performance.value = performanceRes.status === 'fulfilled' ? performanceRes.value.data : []
  for (const r of [settingsRes, actionsRes, recentRes, podcastsRes, performanceRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })

  loading.value = false
}

function onStep(step: DayPlanStep) {
  useAnalytics().track('home_plan_step_click', { step: step.key, position: steps.value.indexOf(step) + 1 })
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
