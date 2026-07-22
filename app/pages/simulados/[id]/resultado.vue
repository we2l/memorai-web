<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <button class="text-base-muted hover:text-base-primary text-sm flex items-center gap-1 mb-6" @click="navigateTo('/simulados')">
      <ArrowLeft :size="16" /> Voltar aos simulados
    </button>

    <div v-if="!quiz" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full mx-auto" />
    </div>

    <template v-else>
      <!-- Score -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 mb-4"
          :class="scoreBorderClass"
        >
          <span class="text-3xl font-bold" :class="scoreTextClass">{{ Math.round(quiz.score_percent ?? 0) }}%</span>
        </div>
        <h1 class="font-heading font-bold text-2xl text-base-primary">{{ quiz.title }}</h1>
        <p class="text-base-muted text-sm mt-1">
          {{ quiz.correct_count }}/{{ quiz.total_questions }} corretas
          <span v-if="quiz.time_spent_seconds"> · {{ formatTime(quiz.time_spent_seconds) }}</span>
          <span v-if="quiz.topic"> · {{ quiz.topic.name }}</span>
        </p>
      </div>

      <!-- CTAs -->
      <div class="flex flex-wrap justify-center gap-3 mb-8">
        <button class="btn-primary !text-sm" @click="createCards" :disabled="creatingCards">
          {{ creatingCards ? 'Criando...' : `Criar cards dos erros (${wrongCount})` }}
        </button>
        <button class="btn-secondary !text-sm" @click="navigateTo('/simulados')">Novo simulado</button>
      </div>

      <!-- Breakdown by topic_tag -->
      <div v-if="breakdown.length > 1" class="card-base p-5 mb-6">
        <p class="text-small font-medium text-base-primary mb-3">Desempenho por tópico</p>
        <div class="space-y-3">
          <div v-for="item in breakdown" :key="item.tag">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-base-secondary">{{ item.tag }}</span>
              <span class="text-base-muted">{{ item.correct }}/{{ item.total }}</span>
            </div>
            <div class="h-2 bg-[var(--border-divider)] rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="getBarColor(item.percent)" :style="{ width: `${item.percent}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Review -->
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-heading font-semibold text-lg text-base-primary">Gabarito</h2>
        <div class="flex gap-2">
          <button class="text-xs px-2 py-1 rounded-lg transition-colors" :class="filter === 'all' ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'text-base-muted hover:text-base-primary'" @click="filter = 'all'">Todas</button>
          <button class="text-xs px-2 py-1 rounded-lg transition-colors" :class="filter === 'wrong' ? 'bg-danger/10 text-danger' : 'text-base-muted hover:text-base-primary'" @click="filter = 'wrong'">Só erros</button>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="q in filteredQuestions"
          :key="q.id"
          class="card-base p-4 border-l-4"
          :class="q.is_correct ? 'border-l-success' : 'border-l-danger'"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <p class="text-sm text-base-primary flex-1">{{ q.position }}. {{ q.stem }}</p>
            <span class="text-xs px-1.5 py-0.5 rounded shrink-0" :class="q.is_correct ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
              {{ q.is_correct ? '✓' : '✗' }}
            </span>
          </div>

          <div v-if="!q.is_correct && q.user_answer" class="text-xs text-danger mb-1">
            Sua resposta: {{ formatAnswer(q, q.user_answer) }}
          </div>
          <div class="text-xs text-success mb-2">
            Correta: {{ formatAnswer(q, q.correct_answer ?? '') }}
          </div>
          <p v-if="q.explanation" class="text-xs text-base-muted">{{ q.explanation }}</p>
          <p v-if="q.ai_feedback" class="text-xs text-base-muted mt-1 italic">IA: {{ q.ai_feedback }} ({{ Math.round((q.ai_score ?? 0) * 100) }}%)</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const quizStore = useQuizStore()
const toast = useToast()

const filter = ref<'all' | 'wrong'>('all')
const creatingCards = ref(false)

const quiz = computed(() => quizStore.currentQuiz)
const questions = computed(() => quizStore.questions)
const wrongCount = computed(() => questions.value.filter((q) => q.is_correct === false).length)

const filteredQuestions = computed(() => {
  if (filter.value === 'wrong') return questions.value.filter((q) => q.is_correct === false)
  return questions.value
})

const breakdown = computed(() => {
  const map = new Map<string, { correct: number; total: number }>()
  for (const q of questions.value) {
    const tag = q.topic_tag || 'Geral'
    if (!map.has(tag)) map.set(tag, { correct: 0, total: 0 })
    const entry = map.get(tag)!
    entry.total++
    if (q.is_correct) entry.correct++
  }
  return Array.from(map.entries()).map(([tag, data]) => ({
    tag,
    ...data,
    percent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }))
})

const scoreBorderClass = computed(() => {
  const s = quiz.value?.score_percent ?? 0
  if (s >= 70) return 'border-success'
  if (s >= 50) return 'border-warning'
  return 'border-danger'
})

const scoreTextClass = computed(() => {
  const s = quiz.value?.score_percent ?? 0
  if (s >= 70) return 'text-success'
  if (s >= 50) return 'text-warning'
  return 'text-danger'
})

onMounted(async () => {
  const id = route.params.id as string
  await quizStore.fetchQuiz(id)
})

async function createCards() {
  creatingCards.value = true
  try {
    const count = await quizStore.createCardsFromErrors(quiz.value!.id)
    toast.show(`${count} cards criados dos erros!`, 'success')
  } catch {
    toast.show('Erro ao criar cards', 'error')
  } finally {
    creatingCards.value = false
  }
}

function getBarColor(percent: number) {
  if (percent >= 70) return 'bg-success'
  if (percent >= 50) return 'bg-warning'
  return 'bg-danger'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatAnswer(q: QuizQuestion, answer: string) {
  if (q.type === 'true_false') return answer === 'true' ? 'Verdadeiro' : 'Falso'
  return answer
}
</script>
