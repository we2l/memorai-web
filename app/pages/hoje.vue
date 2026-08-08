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
    />

    <!-- Grid: Cadernos (esquerda) + Feed (direita) -->
    <div v-if="topicProgress.length || feedItems.length" class="home-grid">
      <HomeLibrary :topics="topicProgress" />
      <HomeFeed :items="feedItems" />
    </div>

    <!-- Outras Formas de Revisar -->
    <HomeReviewModes
      :total-cards="totalCards"
      :has-lapsed-cards="hasLapsedCards"
      :survival-available="survivalAvailable"
    />

    <!-- Activation (new users only) -->
    <section v-if="stats && isNewUser" class="mt-6">
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

async function loadData() {
  const [statsRes, progressRes, backlogRes, retRes, settingsRes, actionsRes] = await Promise.all([
    $api<any>('/stats'),
    $api<any>('/topics/progress'),
    $api<any>('/review/backlog-stats'),
    $api<any>('/review/retention-suggestion').catch(() => ({ data: { has_suggestion: false } })),
    $api<any>('/settings'),
    $api<any>('/stats/pending-actions').catch(() => ({ data: [] })),
  ])
  stats.value = statsRes.data
  topicProgress.value = progressRes.data
  backlog.value = backlogRes.data
  retentionSuggestion.value = retRes.data
  survivalActive.value = settingsRes.data.survival_mode ?? false
  pendingActions.value = actionsRes.data
  featureUsage.fetchUsage()
  examStore.fetchUpcoming()
}

async function toggleSurvivalMode(enabled: boolean) {
  try {
    await $api('/review/survival-mode', { method: 'POST', body: { enabled } })
    await loadData()
  } catch {}
}

async function applyRetention() {
  if (!retentionSuggestion.value?.suggested_retention) return
  try {
    await $api('/review/apply-retention', {
      method: 'POST',
      body: { desired_retention: retentionSuggestion.value.suggested_retention },
    })
    retentionSuggestion.value = { has_suggestion: false }
    await loadData()
  } catch {}
}

function dismissRetention() {
  retentionSuggestion.value = { has_suggestion: false }
}

onMounted(loadData)

const route = useRoute()
watch(() => route.fullPath, () => {
  if (route.path === '/hoje') loadData()
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px 80px;
}
@media (min-width: 768px) {
  .home { padding: 48px 48px 48px; }
}

.home-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 48px;
}
@media (min-width: 1024px) {
  .home-grid {
    grid-template-columns: 8fr 4fr;
  }
}
</style>
