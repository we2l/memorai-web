<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-heading font-bold text-3xl text-base-primary">Simulados</h1>
      <button class="btn-primary" @click="showConfig = true">
        <Plus :size="18" class="mr-1.5" />
        Novo simulado
      </button>
    </div>

    <!-- Evolution chart -->
    <div v-if="stats && stats.evolution.length >= 3" class="card-base p-5 mb-6">
      <p class="text-small text-base-muted mb-3">Evolução de desempenho</p>
      <div class="flex items-end gap-1 h-16">
        <div
          v-for="(point, i) in stats.evolution"
          :key="i"
          class="flex-1 rounded-t transition-all"
          :class="getScoreColor(point.score_percent)"
          :style="{ height: `${Math.max(point.score_percent, 8)}%` }"
          :title="`${Math.round(point.score_percent)}%`"
        />
      </div>
      <div class="flex justify-between mt-1">
        <span class="text-[11px] text-base-muted">{{ stats.evolution.length }} simulados</span>
        <span class="text-[11px] text-base-muted">Média: {{ Math.round(stats.average_score ?? 0) }}%</span>
      </div>
    </div>

    <!-- In progress -->
    <div v-for="quiz in inProgress" :key="quiz.id" class="card-base p-4 mb-3 border-l-4 border-l-warning">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-base-primary text-sm">{{ quiz.title }}</p>
          <p class="text-xs text-base-muted mt-0.5">{{ quiz.topic?.name }} · {{ quiz.answeredDisplay }}</p>
        </div>
        <NuxtLink :to="`/simulados/${quiz.id}`" class="btn-primary !py-1.5 !px-3 !text-small">Retomar</NuxtLink>
      </div>
    </div>

    <!-- Completed list -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card-base p-4 animate-pulse h-20" />
    </div>

    <div v-else-if="completed.length === 0 && inProgress.length === 0" class="text-center py-16">
      <ClipboardCheck :size="48" class="mx-auto text-base-muted mb-4 opacity-50" />
      <p class="text-base-muted mb-2">Nenhum simulado ainda</p>
      <p class="text-sm text-base-muted mb-4">Teste seu conhecimento com simulados gerados por IA</p>
      <button class="btn-primary" @click="showConfig = true">Criar primeiro simulado</button>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="quiz in completed"
        :key="quiz.id"
        :to="`/simulados/${quiz.id}/resultado`"
        class="card-base p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
      >
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
          :class="getScoreBadge(quiz.score_percent)"
        >
          {{ Math.round(quiz.score_percent ?? 0) }}%
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-base-primary text-sm truncate">{{ quiz.title }}</p>
          <p class="text-xs text-base-muted mt-0.5">
            {{ quiz.topic?.name }} · {{ quiz.correct_count }}/{{ quiz.total_questions }} corretas
            <span v-if="quiz.time_spent_seconds"> · {{ formatTime(quiz.time_spent_seconds) }}</span>
          </p>
        </div>
        <ChevronRight :size="16" class="text-base-muted shrink-0" />
      </NuxtLink>
    </div>

    <!-- Config Sheet -->
    <QuizConfigSheet v-model="showConfig" @created="onQuizCreated" />
  </div>
</template>

<script setup lang="ts">
import { Plus, ClipboardCheck, ChevronRight } from 'lucide-vue-next'

definePageMeta({ layout: 'default' })

const quizStore = useQuizStore()
const showConfig = ref(false)

const loading = computed(() => quizStore.loading)
const stats = computed(() => quizStore.stats)

const inProgress = computed(() =>
  quizStore.quizzes.filter((q) => q.status === 'in_progress')
)
const completed = computed(() =>
  quizStore.quizzes.filter((q) => q.status === 'completed')
)

onMounted(async () => {
  await Promise.all([
    quizStore.fetchQuizzes(),
    quizStore.fetchStats(),
  ])
})

function onQuizCreated(quiz: any) {
  showConfig.value = false
  navigateTo(`/simulados/${quiz.id}`)
}

function getScoreColor(score: number) {
  if (score >= 70) return 'bg-success'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

function getScoreBadge(score: number | null) {
  const s = score ?? 0
  if (s >= 70) return 'bg-success/10 text-success'
  if (s >= 50) return 'bg-warning/10 text-warning'
  return 'bg-danger/10 text-danger'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>
