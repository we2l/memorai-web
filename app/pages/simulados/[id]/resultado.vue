<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-3xl mx-auto">
    <button class="text-base-muted hover:text-base-primary text-sm flex items-center gap-1 mb-6" @click="navigateTo('/simulados')">
      <ArrowLeft :size="16" /> Voltar aos simulados
    </button>

    <div v-if="!quiz" class="text-center py-16">
      <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full mx-auto" />
    </div>

    <template v-else>
      <!-- Score Hero -->
      <div class="rounded-2xl bg-[var(--bg-card)] border border-base p-8 shadow-sm text-center mb-6">
        <div
          class="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 mb-4"
          :class="scoreBorderClass"
        >
          <span class="text-3xl font-bold" :class="scoreTextClass">{{ Math.round(quiz.score_percent ?? 0) }}%</span>
        </div>
        <h1 class="font-heading font-bold text-xl text-base-primary">{{ quiz.title }}</h1>
        <div class="flex items-center justify-center gap-3 text-sm text-base-muted mt-2">
          <span class="flex items-center gap-1"><CheckCircle2 :size="14" class="text-success" /> {{ quiz.correct_count }} certas</span>
          <span>·</span>
          <span class="flex items-center gap-1"><XCircle :size="14" class="text-danger" /> {{ wrongCount }} erradas</span>
          <span v-if="quiz.time_spent_seconds">·</span>
          <span v-if="quiz.time_spent_seconds" class="flex items-center gap-1"><Clock :size="14" /> {{ formatTime(quiz.time_spent_seconds) }}</span>
        </div>

        <!-- CTAs -->
        <div class="flex flex-wrap justify-center gap-3 mt-6">
          <button class="btn-primary !text-sm" @click="createCards" :disabled="creatingCards || wrongCount === 0 || cardsCreated">
            <span v-if="cardsCreated">✓ Cards criados</span>
            <span v-else-if="creatingCards">Criando...</span>
            <span v-else>Criar cards dos erros ({{ wrongCount }})</span>
          </button>
          <button class="btn-secondary !text-sm" @click="navigateTo('/simulados')">Novo simulado</button>
        </div>
      </div>

      <!-- Breakdown by topic_tag -->
      <div v-if="breakdown.length > 1" class="rounded-2xl bg-[var(--bg-card)] border border-base p-5 shadow-sm mb-6">
        <!-- Weak topic insight -->
        <UiInsightBanner
          v-if="weakTopics.length"
          class="mb-4"
          icon="⚠️"
          :text="weakTopics.length === 1
            ? `${weakTopics[0].tag}: ${weakTopics[0].percent}% acerto — considere revisar este tema`
            : `${weakTopics.map(t => t.tag).join(' e ')}: abaixo de 50% — considere revisar`"
          variant="warning"
          dismissible
        />
        <p class="text-small font-medium text-base-secondary mb-4">Desempenho por tópico</p>
        <div class="space-y-4">
          <div v-for="item in breakdown" :key="item.tag">
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-base-primary font-medium">{{ item.tag }}</span>
              <span class="text-base-muted">{{ item.correct }}/{{ item.total }} · {{ item.percent }}%</span>
            </div>
            <div class="h-2.5 bg-[var(--border-divider)] rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="getBarColor(item.percent)" :style="{ width: `${item.percent}%` }" />
            </div>
          </div>
        </div>
      </div>

      <!-- Review -->
      <div class="rounded-2xl bg-[var(--bg-card)] border border-base shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--border-divider)]">
          <h2 class="font-heading font-semibold text-base text-base-primary">Gabarito</h2>
          <div class="flex gap-1 bg-[var(--bg-soft)] rounded-lg p-0.5">
            <button
              class="text-xs px-3 py-1.5 rounded-md transition-colors"
              :class="filter === 'all' ? 'bg-[var(--bg-card)] text-base-primary shadow-sm' : 'text-base-muted'"
              @click="filter = 'all'"
            >Todas</button>
            <button
              class="text-xs px-3 py-1.5 rounded-md transition-colors"
              :class="filter === 'wrong' ? 'bg-[var(--bg-card)] text-danger shadow-sm' : 'text-base-muted'"
              @click="filter = 'wrong'"
            >Só erros ({{ wrongCount }})</button>
          </div>
        </div>

        <div class="divide-y divide-[var(--border-divider)]">
          <div
            v-for="q in filteredQuestions"
            :key="q.id"
            class="p-5"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                :class="q.is_correct ? 'bg-success/10' : 'bg-danger/10'"
              >
                <CheckCircle2 v-if="q.is_correct" :size="14" class="text-success" />
                <XCircle v-else :size="14" class="text-danger" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-base-muted">{{ q.position }}</span>
                  <span v-if="q.topic_tag" class="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-soft)] text-base-muted">{{ q.topic_tag }}</span>
                </div>
                <p class="text-sm text-base-primary leading-relaxed">{{ q.stem }}</p>

                <div class="mt-3 space-y-1.5">
                  <div v-if="!q.is_correct && q.user_answer" class="flex items-start gap-2 text-xs">
                    <span class="text-danger font-medium shrink-0">Você:</span>
                    <span class="text-base-secondary">{{ formatAnswer(q, q.user_answer) }}</span>
                  </div>
                  <div class="flex items-start gap-2 text-xs">
                    <span class="text-success font-medium shrink-0">Correta:</span>
                    <span class="text-base-primary font-medium">{{ formatAnswer(q, q.correct_answer ?? '') }}</span>
                  </div>
                </div>

                <p v-if="q.explanation" class="text-xs text-base-muted mt-3 pl-3 border-l-2 border-[var(--border-divider)] leading-relaxed">{{ q.explanation }}</p>
                <p v-if="q.ai_feedback" class="text-xs text-base-muted mt-2 italic">Correção IA: {{ q.ai_feedback }} ({{ Math.round((q.ai_score ?? 0) * 100) }}%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-vue-next'
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
const cardsCreated = computed(() => !!quiz.value?.cards_created_at)

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

const weakTopics = computed(() => breakdown.value.filter(t => t.percent < 50 && t.total >= 2).slice(0, 2))

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
  if (!quiz.value?.id) {
    toast.show('Simulado não carregado', 'error')
    return
  }
  creatingCards.value = true
  try {
    const count = await quizStore.createCardsFromErrors(quiz.value.id)
    toast.show(`${count} cards criados dos erros!`, 'success')
    await quizStore.fetchQuiz(quiz.value.id)
  } catch (e: any) {
    console.error('createCards error:', e)
    toast.show(e?.data?.message || 'Erro ao criar cards', 'error')
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
  if (q.type === 'multiple_choice' && q.options) {
    const letter = answer.toLowerCase().trim()
    const match = q.options.find((o) => o.toLowerCase().startsWith(letter + ')'))
    if (match) return match
  }
  return answer
}
</script>
