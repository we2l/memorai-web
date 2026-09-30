<template>
  <div class="home">
    <!-- Banners -->
    <HomeBanner
      :retention-suggestion="retentionSuggestion"
      :survival-active="survivalActive"
      :backlog="backlog"
      @apply-retention="applyRetention"
      @dismiss-retention="dismissRetention"
      @toggle-survival="toggleSurvivalMode"
    />

    <!-- Hero -->
    <HomeHero
      :stats="stats"
      :backlog="backlog"
      :topic-progress="topicProgress"
      :next-exam="nextExam"
      :user-name="auth.user?.name ?? 'estudante'"
      :loading="heroLoading"
      :error="heroError"
      @retry="loadData"
    />

    <!-- Content: Cadernos + Feed -->
    <div v-if="topicProgress.length || feedItems.length || libraryLoading || libraryError" class="home__content">
      <HomeLibrary :topics="topicProgress" :loading="libraryLoading" :error="libraryError" @retry="loadData" />
      <HomeFeed :items="feedItems" />
    </div>

    <!-- Outras Formas de Revisar -->
    <HomeReviewModes
      :total-cards="totalCards"
      :has-lapsed-cards="hasLapsedCards"
      :survival-available="survivalAvailable"
    />

    <!-- Activation (new users only) -->
    <section v-if="stats && isNewUser" class="home__activation">
      <UiActivationChecklist
        :has-topics="Number(stats.total_decks) > 0"
        :has-material="Number(stats.total_decks) > 0"
        :has-cards="Number(stats.total_cards) > 0"
        :has-reviewed="Number(stats.cards_reviewed_today) > 0 || Number(stats.streak) > 0"
        :streak="Number(stats.streak)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Stats, TopicProgress, BacklogStats } from '~/types'

const auth = useAuthStore()
const examStore = useExamStore()
const featureUsage = useFeatureUsage()
const { $api } = useNuxtApp()

const stats = ref<Stats | null>(null)
const topicProgress = ref<TopicProgress[]>([])
const backlog = ref<BacklogStats | null>(null)
const retentionSuggestion = ref<any>(null)
const survivalActive = ref(false)
const pendingActions = ref<any[]>([])

const totalCards = computed(() => (stats.value?.due_today ?? 0) + (backlog.value?.overdue_count ?? 0))

const hasLapsedCards = computed(() =>
  (stats.value?.total_cards ?? 0) > 0 &&
  ((stats.value?.reviewed_today ?? 0) > 0 || (stats.value?.ratings_today?.again ?? 0) > 0 || (stats.value?.streak ?? 0) > 0),
)

const survivalAvailable = computed(() => (backlog.value?.overdue_count ?? 0) >= 100)

const nextExam = computed(() => {
  const exam = examStore.upcoming[0]
  if (!exam || exam.days_remaining > 14) return null
  return exam
})

const isNewUser = computed(() => {
  if (!auth.user?.created_at) return false
  return Date.now() - new Date(auth.user.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
})

const feedItems = computed(() => {
  const items = [...pendingActions.value]
  if (auth.user?.plan !== 'free' && (stats.value?.reviewed_today ?? 0) > 0) {
    if (!items.some(i => i.url?.includes('podcast'))) {
      items.push({ icon: '🎧', label: 'Podcast disponível', description: 'Seus pontos fracos', action_label: 'Ouvir', url: '/podcasts' })
    }
  }
  return items.slice(0, 4).map(item => ({
    ...item,
    icon: item.icon || guessIcon(item.label),
    description: item.description || guessDescription(item.label),
  }))
})

function guessIcon(label: string): string {
  if (label.includes('PDF') || label.includes('material')) return '📄'
  if (label.includes('esquecendo') || label.includes('evisar') || label.includes('fraco')) return '🧠'
  if (label.includes('podcast') || label.includes('Podcast')) return '🎧'
  if (label.includes('quiz') || label.includes('simulado')) return '📝'
  return '✨'
}

function guessDescription(label: string): string {
  if (label.includes('PDF') || label.includes('processado')) return 'Conceitos encontrados'
  if (label.includes('esquecendo') || label.includes('fraco')) return 'Cards pendentes'
  return ''
}

const heroLoading = ref(true)
const heroError = ref(false)
const libraryLoading = ref(true)
const libraryError = ref(false)

/** Each block has its own state: a failing /stats never turns into "Crie seus primeiros cards" (RF-F3.6). */
async function loadData() {
  heroLoading.value = true
  libraryLoading.value = true
  heroError.value = false
  libraryError.value = false
  const [statsRes, progressRes, backlogRes, retRes, settingsRes, actionsRes] = await Promise.allSettled([
    $api<any>('/stats'),
    $api<any>('/topics/progress'),
    $api<any>('/review/backlog-stats'),
    $api<any>('/review/retention-suggestion'),
    $api<any>('/settings'),
    $api<any>('/stats/pending-actions'),
  ])

  if (statsRes.status === 'fulfilled' && backlogRes.status === 'fulfilled') {
    stats.value = statsRes.value.data
    backlog.value = backlogRes.value.data
  } else {
    heroError.value = true
    reportApiError(statsRes.status === 'rejected' ? statsRes.reason : (backlogRes as PromiseRejectedResult).reason, { silent: true })
  }
  heroLoading.value = false

  if (progressRes.status === 'fulfilled') topicProgress.value = progressRes.value.data
  else {
    libraryError.value = true
    reportApiError(progressRes.reason, { silent: true })
  }
  libraryLoading.value = false

  // Decorative blocks: silent on failure
  retentionSuggestion.value = retRes.status === 'fulfilled' ? retRes.value.data : { has_suggestion: false }
  if (settingsRes.status === 'fulfilled') survivalActive.value = settingsRes.value.data.survival_mode ?? false
  pendingActions.value = actionsRes.status === 'fulfilled' ? actionsRes.value.data : []
  for (const r of [retRes, settingsRes, actionsRes]) if (r.status === 'rejected') reportApiError(r.reason, { silent: true })

  featureUsage.fetchUsage()
  examStore.fetchUpcoming()
}

const { run } = useApiAction()

async function toggleSurvivalMode(enabled: boolean) {
  const ok = await run(() => $api('/review/survival-mode', { method: 'POST', body: { enabled } }), {
    error: 'Não foi possível mudar o modo sobrevivência.',
  })
  if (ok !== undefined) await loadData()
}

async function applyRetention() {
  if (!retentionSuggestion.value?.suggested_retention) return
  const ok = await run(() => $api('/review/apply-retention', {
    method: 'POST',
    body: { desired_retention: retentionSuggestion.value.suggested_retention },
  }), { error: 'Não foi possível aplicar a sugestão.' })
  if (ok === undefined) return
  retentionSuggestion.value = { has_suggestion: false }
  await loadData()
}

function dismissRetention() {
  retentionSuggestion.value = { has_suggestion: false }
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
</script>

<style scoped>
.home {
  padding: 24px 32px 40px;
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}
@media (min-width: 1280px) {
  .home {
    padding: 28px 48px 40px;
  }
}
@media (min-width: 1600px) {
  .home {
    padding: 32px 64px 48px;
  }
}

.home__content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 36px;
  flex: 1;
}
@media (min-width: 1024px) {
  .home__content {
    grid-template-columns: 1fr 280px;
    gap: 48px;
  }
}

.home__activation {
  margin-top: 24px;
}
</style>
