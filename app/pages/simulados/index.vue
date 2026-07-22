<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-heading font-bold text-3xl text-base-primary">Simulados</h1>
        <p class="text-sm text-base-muted mt-1">Teste seu conhecimento com provas geradas por IA</p>
      </div>
      <button class="btn-primary" @click="showConfig = true">
        <Plus :size="18" class="mr-1.5" />
        Novo simulado
      </button>
    </div>

    <!-- Evolution chart -->
    <div v-if="stats && stats.evolution.length >= 3" class="rounded-2xl bg-[var(--bg-card)] border border-base p-5 mb-6 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <p class="text-small font-medium text-base-secondary">Evolução</p>
        <span class="text-xs text-base-muted">Média: {{ Math.round(stats.average_score ?? 0) }}%</span>
      </div>
      <div class="flex items-end gap-1.5 h-20">
        <div
          v-for="(point, i) in stats.evolution"
          :key="i"
          class="flex-1 rounded-t-md transition-all"
          :class="getScoreBarColor(point.score_percent)"
          :style="{ height: `${Math.max(point.score_percent, 8)}%` }"
          :title="`${Math.round(point.score_percent)}%`"
        />
      </div>
    </div>

    <!-- In progress -->
    <div v-if="inProgress.length" class="mb-6">
      <p class="text-small font-medium text-base-secondary mb-3">Em andamento</p>
      <div class="space-y-3">
        <div
          v-for="quiz in inProgress"
          :key="quiz.id"
          class="rounded-2xl bg-[var(--bg-card)] border border-base p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Clock :size="22" class="text-warning" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-base-primary text-sm truncate">{{ quiz.title }}</p>
            <p class="text-xs text-base-muted mt-0.5">{{ quiz.topic?.name }} · {{ quiz.total_questions }} questões</p>
          </div>
          <NuxtLink :to="`/simulados/${quiz.id}`" class="btn-primary !py-2 !px-4 !text-sm">Retomar</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="rounded-2xl bg-[var(--bg-card)] border border-base p-5 animate-pulse h-20" />
    </div>

    <!-- Empty state -->
    <div v-else-if="completed.length === 0 && inProgress.length === 0" class="text-center py-16">
      <div class="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
        <ClipboardCheck :size="36" class="text-accent-primary" />
      </div>
      <p class="text-title text-base-secondary">Nenhum simulado ainda</p>
      <p class="text-small text-base-muted mt-1 max-w-xs mx-auto">Gere simulados a partir dos seus cadernos e descubra seus pontos fracos.</p>
      <button class="btn-primary mt-5" @click="showConfig = true">Criar primeiro simulado</button>
    </div>

    <!-- Completed list -->
    <template v-else>
      <p v-if="inProgress.length" class="text-small font-medium text-base-secondary mb-3">Concluídos</p>
      <div class="space-y-3">
        <NuxtLink
          v-for="quiz in completed"
          :key="quiz.id"
          :to="`/simulados/${quiz.id}/resultado`"
          class="rounded-2xl bg-[var(--bg-card)] border border-base p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[var(--border-hover)] transition-all block"
        >
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            :class="getScoreBadgeClass(quiz.score_percent)"
          >
            {{ Math.round(quiz.score_percent ?? 0) }}%
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-base-primary text-sm truncate">{{ quiz.title }}</p>
            <div class="flex items-center gap-2 text-xs text-base-muted mt-0.5">
              <span>{{ quiz.topic?.name }}</span>
              <span>·</span>
              <span>{{ quiz.correct_count }}/{{ quiz.total_questions }}</span>
              <span v-if="quiz.time_spent_seconds">· {{ formatTime(quiz.time_spent_seconds) }}</span>
            </div>
          </div>
          <ChevronRight :size="16" class="text-base-muted shrink-0" />
        </NuxtLink>
      </div>
    </template>

    <!-- Config Sheet -->
    <QuizConfigSheet v-model="showConfig" @created="onQuizCreated" />
  </div>
</template>

<script setup lang="ts">
import { Plus, ClipboardCheck, ChevronRight, Clock } from 'lucide-vue-next'

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

function getScoreBarColor(score: number) {
  if (score >= 70) return 'bg-success'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

function getScoreBadgeClass(score: number | null) {
  const s = score ?? 0
  if (s >= 70) return 'bg-success/10 text-success border border-success/20'
  if (s >= 50) return 'bg-warning/10 text-warning border border-warning/20'
  return 'bg-danger/10 text-danger border border-danger/20'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>
