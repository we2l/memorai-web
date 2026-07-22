<template>
  <div class="min-h-screen bg-[var(--bg-base)] flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border-divider)] px-4 py-3">
      <div class="max-w-3xl mx-auto flex items-center justify-between">
        <button class="text-base-muted hover:text-base-primary text-sm flex items-center gap-1" @click="handleExit">
          <ArrowLeft :size="16" /> Sair
        </button>

        <div class="flex items-center gap-3">
          <!-- Timer -->
          <div v-if="quizStore.hasTimer" class="flex items-center gap-1.5 text-sm font-mono" :class="timeWarning ? 'text-danger' : 'text-base-secondary'">
            <Clock :size="14" />
            {{ formattedTime }}
          </div>

          <!-- Progress -->
          <span class="text-sm text-base-muted">{{ quizStore.progress.current }} de {{ quizStore.progress.total }}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="max-w-3xl mx-auto mt-2">
        <div class="h-1 bg-[var(--border-divider)] rounded-full overflow-hidden">
          <div class="h-full bg-[var(--color-primary-500)] rounded-full transition-all duration-300" :style="{ width: `${quizStore.progress.percent}%` }" />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 flex items-start justify-center px-4 py-8">
      <div v-if="loadingQuiz" class="text-center py-16">
        <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-base-muted">Gerando questões...</p>
        <p class="text-xs text-base-muted mt-1">Isso pode levar até 30 segundos</p>
      </div>

      <div v-else-if="question" class="w-full max-w-[640px]">
        <!-- Question stem -->
        <div class="mb-6">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-base-muted mb-3">
            <span class="px-1.5 py-0.5 rounded bg-[var(--bg-soft)]">{{ questionTypeLabel }}</span>
            <span v-if="question.topic_tag" class="px-1.5 py-0.5 rounded bg-[var(--bg-soft)]">{{ question.topic_tag }}</span>
          </span>
          <p class="text-lg text-base-primary leading-relaxed">{{ question.stem }}</p>
        </div>

        <!-- Multiple Choice -->
        <div v-if="question.type === 'multiple_choice'" class="space-y-3">
          <button
            v-for="(option, i) in question.options"
            :key="i"
            class="w-full text-left p-4 rounded-xl border transition-all"
            :class="getOptionClass(option, i)"
            :disabled="isAnswered && isLearning"
            @click="selectOption(option)"
          >
            <span class="text-sm">{{ option }}</span>
          </button>
        </div>

        <!-- True/False -->
        <div v-else-if="question.type === 'true_false'" class="grid grid-cols-2 gap-4">
          <button
            class="p-6 rounded-xl border text-center font-medium transition-all"
            :class="getTFClass('true')"
            :disabled="isAnswered && isLearning"
            @click="selectOption('true')"
          >
            Verdadeiro
          </button>
          <button
            class="p-6 rounded-xl border text-center font-medium transition-all"
            :class="getTFClass('false')"
            :disabled="isAnswered && isLearning"
            @click="selectOption('false')"
          >
            Falso
          </button>
        </div>

        <!-- Short Answer -->
        <div v-else-if="question.type === 'short_answer'">
          <textarea
            v-model="shortAnswer"
            class="input-base w-full min-h-[120px] resize-y"
            placeholder="Digite sua resposta..."
            :disabled="isAnswered && isLearning"
          />
          <p class="text-xs text-base-muted mt-1 text-right">{{ shortAnswer.length }} caracteres</p>
        </div>

        <!-- Feedback (learning mode, after answering) -->
        <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0">
          <div v-if="isAnswered && isLearning && question.type !== 'short_answer' && question.is_correct !== null" class="mt-6 p-4 rounded-xl border" :class="question.is_correct ? 'bg-success/5 border-success/30' : 'bg-danger/5 border-danger/30'">
            <p class="font-medium text-sm" :class="question.is_correct ? 'text-success' : 'text-danger'">
              {{ question.is_correct ? '✓ Correto!' : '✗ Incorreto' }}
            </p>
            <p v-if="question.correct_answer && !question.is_correct" class="text-sm text-base-secondary mt-1">
              Resposta correta: <strong>{{ question.correct_answer }}</strong>
            </p>
            <p v-if="question.explanation" class="text-sm text-base-secondary mt-2">{{ question.explanation }}</p>
          </div>
          <div v-else-if="isAnswered && isLearning && question.type === 'short_answer'" class="mt-6 p-4 rounded-xl border border-[var(--border-base)] bg-[var(--bg-soft)]">
            <p class="text-sm text-base-secondary">✓ Resposta salva. Será corrigida ao finalizar o simulado.</p>
          </div>
        </Transition>
      </div>
    </main>

    <!-- Footer -->
    <footer class="sticky bottom-0 bg-[var(--bg-card)] border-t border-[var(--border-divider)] px-4 py-3">
      <div class="max-w-[640px] mx-auto flex items-center justify-between">
        <button
          class="btn-secondary !py-2 !px-4 !text-sm"
          :disabled="quizStore.currentIndex === 0"
          @click="quizStore.prevQuestion()"
        >
          ← Anterior
        </button>

        <div v-if="!isAnswered && question?.type !== 'short_answer'" class="text-xs text-base-muted">
          Selecione uma opção
        </div>
        <button
          v-else-if="!isAnswered && question?.type === 'short_answer'"
          class="btn-primary !py-2 !px-4 !text-sm"
          :disabled="!shortAnswer.trim()"
          @click="submitShortAnswer"
        >
          Confirmar
        </button>

        <button
          v-if="isLastQuestion && isAnswered"
          class="btn-primary !py-2 !px-4 !text-sm"
          @click="handleFinish"
        >
          Finalizar
        </button>
        <button
          v-else-if="isAnswered"
          class="btn-primary !py-2 !px-4 !text-sm"
          @click="quizStore.nextQuestion()"
        >
          Próxima →
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Clock } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const quizStore = useQuizStore()
const toast = useToast()

const loadingQuiz = ref(true)
const shortAnswer = ref('')
const selectedAnswer = ref<string | null>(null)

const question = computed(() => quizStore.currentQuestion)
const isLearning = computed(() => quizStore.currentQuiz?.mode === 'learning')
const isAnswered = computed(() => question.value?.user_answer !== null)
const isLastQuestion = computed(() => quizStore.currentIndex === quizStore.questions.length - 1)
const timeWarning = computed(() => quizStore.timeRemaining > 0 && quizStore.timeRemaining < 60)

const formattedTime = computed(() => {
  const t = quizStore.timeRemaining
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const questionTypeLabel = computed(() => {
  const labels: Record<string, string> = { multiple_choice: 'Múltipla escolha', true_false: 'V ou F', short_answer: 'Dissertativa' }
  return labels[question.value?.type ?? ''] ?? ''
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    const quiz = await quizStore.fetchQuiz(id)

    // Quiz failed during generation
    if (quiz.status === 'failed') {
      toast.show('Falha ao gerar simulado. Tente novamente com outro caderno.', 'error')
      await navigateTo('/simulados')
      return
    }

    // Still generating — poll until ready
    if (quiz.status === 'configuring') {
      await quizStore.pollUntilReady(id)
    }

    // Check again after polling (might have failed)
    if (quizStore.currentQuiz?.status === 'failed') {
      toast.show('Falha ao gerar simulado. Tente novamente.', 'error')
      await navigateTo('/simulados')
      return
    }

    if (quizStore.currentQuiz?.status === 'in_progress' && !quizStore.currentQuiz.started_at) {
      await quizStore.startQuiz(id)
    } else if (quizStore.currentQuiz?.status === 'in_progress') {
      // Resuming — start timer if needed
      if (quizStore.currentQuiz.time_limit_seconds) {
        quizStore.timeRemaining = quizStore.currentQuiz.time_limit_seconds - (quizStore.currentQuiz.time_spent_seconds ?? 0)
        quizStore.startTimer()
      }
    }
    // Jump to first unanswered question
    const firstUnanswered = quizStore.questions.findIndex((q) => !q.user_answer)
    if (firstUnanswered > 0) quizStore.goToQuestion(firstUnanswered)
  } catch (e: any) {
    toast.show(e?.message || 'Erro ao carregar simulado', 'error')
    await navigateTo('/simulados')
  } finally {
    loadingQuiz.value = false
  }
})

onUnmounted(() => {
  quizStore.stopTimer()
})

// Watch question change to reset local state
watch(() => quizStore.currentIndex, () => {
  shortAnswer.value = question.value?.user_answer ?? ''
  selectedAnswer.value = question.value?.user_answer ?? null
})

async function selectOption(answer: string) {
  if (isAnswered.value && isLearning.value) return
  selectedAnswer.value = answer
  try {
    await quizStore.answerQuestion(question.value!.id, answer)
    // In exam mode, auto-advance
    if (!isLearning.value && !isLastQuestion.value) {
      setTimeout(() => quizStore.nextQuestion(), 300)
    }
  } catch (e: any) {
    toast.show('Erro ao salvar resposta', 'error')
  }
}

async function submitShortAnswer() {
  if (!shortAnswer.value.trim()) return
  try {
    await quizStore.answerQuestion(question.value!.id, shortAnswer.value.trim())
  } catch (e: any) {
    toast.show('Erro ao salvar resposta', 'error')
  }
}

async function handleFinish() {
  try {
    await quizStore.finishQuiz()
    await navigateTo(`/simulados/${quizStore.currentQuiz!.id}/resultado`)
  } catch (e: any) {
    toast.show('Erro ao finalizar', 'error')
  }
}

function handleExit() {
  if (quizStore.answeredCount > 0) {
    quizStore.pauseQuiz()
  }
  navigateTo('/simulados')
}

function getOptionClass(option: string, index: number) {
  const answer = question.value?.user_answer
  const correct = question.value?.correct_answer
  const letter = option.charAt(0).toLowerCase()

  if (!answer) {
    return 'border-[var(--border-base)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)]'
  }

  if (isLearning.value && question.value?.is_correct !== null) {
    if (letter === correct?.toLowerCase()) return 'border-success bg-success/5'
    if (letter === answer?.toLowerCase() && !question.value?.is_correct) return 'border-danger bg-danger/5'
  }

  if (letter === answer?.toLowerCase()) return 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
  return 'border-[var(--border-base)] opacity-60'
}

function getTFClass(value: string) {
  const answer = question.value?.user_answer
  const correct = question.value?.correct_answer

  if (!answer) {
    return 'border-[var(--border-base)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] text-base-primary'
  }

  if (isLearning.value && question.value?.is_correct !== null) {
    if (value === correct) return 'border-success bg-success/5 text-success'
    if (value === answer && !question.value?.is_correct) return 'border-danger bg-danger/5 text-danger'
  }

  if (value === answer) return 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
  return 'border-[var(--border-base)] opacity-60 text-base-muted'
}
</script>
