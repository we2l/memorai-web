<template>
  <div class="flex min-h-dvh flex-col bg-page">
    <QuizTopBar
      :current="quizStore.currentIndex + 1"
      :total="questions.length"
      :answered="quizStore.answeredCount"
      :time-remaining="quizStore.hasTimer && state === 'answering' ? quizStore.timeRemaining : null"
      @exit="exit"
    />

    <main class="mx-auto flex w-full max-w-prose flex-1 flex-col gap-5 px-gutter py-6">
      <div v-if="state === 'loading'" class="flex flex-col gap-3" aria-busy="true">
        <span class="sr-only">Carregando as questões…</span>
        <UiSkeleton variant="block" />
        <UiSkeleton v-for="i in 4" :key="i" variant="row" />
      </div>

      <!-- Generating in blocks of 15 (RF-B3): the poll, with what is being written -->
      <UiSection v-else-if="state === 'generating'" class="flex flex-col items-center gap-3 py-10 text-center" data-testid="quiz-generating">
        <UiSpinner />
        <h1 class="text-section text-fg-strong">Escrevendo {{ plural(requested, 'questão', 'questões') }}</h1>
        <p class="text-meta text-fg-muted">{{ blocks > 1 ? `Em ${blocks} blocos ao mesmo tempo. ` : '' }}Leva até 1 minuto.</p>
        <p v-if="distributionText" class="max-w-md text-meta text-fg">{{ distributionText }}</p>
      </UiSection>

      <UiErrorState
        v-else-if="state === 'failed'"
        variant="hero"
        title="Não conseguimos gerar as questões"
        description="Esta tentativa não contou na sua cota. Tente de novo ou escolha outro assunto."
        data-testid="quiz-failed"
        @retry="retryGeneration"
      />

      <UiErrorState v-else-if="state === 'error'" variant="hero" title="Não foi possível abrir as questões" description="Verifique sua conexão e tente de novo." @retry="load" />

      <template v-else-if="question">
        <!-- Never in silence: what the generation could not deliver (RF-B3) -->
        <p v-if="shortfall > 0 && quizStore.currentIndex === 0" role="status" class="rounded-row bg-soft px-4 py-3 text-meta text-fg" data-testid="quiz-shortfall">
          Saíram {{ questions.length }} de {{ requested }} questões. As que faltaram não vieram do gerador desta vez.
        </p>

        <QuizQuestion
          :key="question.id"
          v-model="selection"
          :question="question"
          :learning="learning"
          :topic-name="questionTopic"
          @ask="askWhyWrong"
        />
      </template>
    </main>

    <footer v-if="state === 'answering' && question" class="sticky bottom-0 border-t border-line bg-raised pb-safe-bottom">
      <div class="mx-auto flex max-w-prose items-center gap-2 px-gutter py-3">
        <UiButton variant="ghost" :icon-left="ArrowLeft" :disabled="quizStore.currentIndex === 0" @click="quizStore.prevQuestion()">Anterior</UiButton>
        <span class="flex-1" />
        <UiButton v-if="!answered && !isLast" variant="ghost" @click="quizStore.nextQuestion()">Pular</UiButton>
        <UiButton variant="primary" :loading="saving || finishing" :disabled="!canAct" data-testid="quiz-primary" @click="primaryAction">
          {{ primaryLabel }}
        </UiButton>
      </div>
      <p class="sr-only">Atalhos: 1 a 5 ou A a E escolhem, Enter confirma, setas esquerda e direita trocam de questão.</p>
    </footer>

    <LazyUiConfirmModal
      v-if="confirmLoaded"
      v-model="confirmFinish"
      title="Finalizar agora?"
      :message="`${plural(unanswered, 'questão ficou', 'questões ficaram')} sem resposta e ${unanswered === 1 ? 'conta' : 'contam'} como erro.`"
      confirm-label="Finalizar"
      variant="primary"
      :loading="finishing"
      @confirm="finish"
    />
  </div>
</template>

<script setup lang="ts">
// Answer a bateria or a simulado (prd-4e-praticar-v3 RF-F3): one question per screen, the alternatives as
// cards (keys 1–5/A–E choose, Enter confirms, ←/→ move between questions), the correction right away in the
// Treino mode, the countdown in the Prova mode and "Saíram 47 de 50" when the generation came short.
// "‹ Sair" pauses and goes back to the scope; a completed quiz opens its result (never the answers greyed).
import { ArrowLeft } from 'lucide-vue-next'
import { cadernoPath } from '~/utils/scope'
import { distributionLabel } from '~/utils/quizDistribution'
import { formatAnswer } from '~/utils/quizAnswer'

definePageMeta({ chrome: 'focus' })
useHead({ title: 'Questões · Baigi' })

const route = useRoute()
const quizStore = useQuizStore()
const topicStore = useTopicStore()

type State = 'loading' | 'generating' | 'failed' | 'error' | 'answering'
const state = ref<State>('loading')
const quizId = computed(() => String(route.params.id))
const quiz = computed(() => quizStore.currentQuiz)
const questions = computed(() => quizStore.questions)
const question = computed(() => quizStore.currentQuestion)
const learning = computed(() => quiz.value?.mode === 'learning')
const answered = computed(() => question.value?.user_answer != null)
const isLast = computed(() => quizStore.currentIndex === questions.value.length - 1)
const unanswered = computed(() => questions.value.filter(q => q.user_answer == null).length)

const requested = computed(() => quiz.value?.config?.quantity ?? quiz.value?.total_questions ?? 0)
const shortfall = computed(() => quiz.value?.shortfall ?? quiz.value?.config?.shortfall ?? 0)
const blocks = computed(() => Math.ceil(requested.value / 15))
const distributionText = computed(() => distributionLabel((quiz.value?.distribution ?? []).map(d => ({ name: d.name, questions: d.questions }))))
const questionTopic = computed(() => question.value?.topic_tag || null)

/** The alternative chosen and not confirmed yet (the answered one once saved) */
const selection = ref<string | null>(null)
watch(question, (q) => { selection.value = q?.user_answer ?? null }, { immediate: true })

const saving = ref(false)
const finishing = ref(false)
const confirmFinish = ref(false)
const confirmLoaded = useLoadedOnce(() => confirmFinish.value)

const canAct = computed(() => {
  if (!answered.value) return !!selection.value?.trim()
  // Prova: changing a saved answer is allowed (Confirmar again)
  return true
})
const changed = computed(() => !learning.value && answered.value && selection.value !== question.value?.user_answer)
const primaryLabel = computed(() => {
  if (!answered.value || changed.value) return 'Confirmar'
  if (isLast.value) return learning.value ? 'Ver resultado' : 'Finalizar'
  return 'Próxima'
})

async function primaryAction() {
  if (!question.value) return
  if (!answered.value || changed.value) return confirm()
  if (isLast.value) return askFinish()
  quizStore.nextQuestion()
}

async function confirm() {
  const q = question.value
  const answer = selection.value?.trim()
  if (!q || !answer || saving.value) return
  saving.value = true
  try {
    await quizStore.answerQuestion(q.id, answer)
    // Prova: straight to the next one; Treino stays for the correction
    if (!learning.value && !isLast.value) quizStore.nextQuestion()
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível salvar a resposta. Tente de novo.' })
  } finally {
    saving.value = false
  }
}

function askFinish() {
  if (unanswered.value > 0) confirmFinish.value = true
  else void finish()
}

async function finish() {
  if (finishing.value) return
  finishing.value = true
  try {
    await quizStore.finishQuiz()
    confirmFinish.value = false
    await navigateTo(`/simulados/${quizId.value}/resultado`, { replace: true })
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível finalizar. Tente de novo.' })
  } finally {
    finishing.value = false
  }
}

/** Back to the scope: the caderno/assunto of the quiz, else Praticar. Pauses (keeps the time) first. */
async function exit() {
  const target = quiz.value?.topic && !quiz.value.topic.in_trash ? cadernoPath(quiz.value.topic.id) : '/praticar'
  if (quiz.value?.status === 'in_progress') {
    try {
      await quizStore.pauseQuiz()
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }
  quizStore.reset()
  await navigateTo(target)
}

function retryGeneration() {
  const topicId = quiz.value?.topic?.id
  void navigateTo(topicId ? `/simulados?topic_id=${topicId}&tab=${quiz.value?.kind === 'exam' ? 'exam' : 'battery'}` : '/simulados?action=new')
}

/** "Por que errei?" (prd-navegacao-v3 RF-9): the tira-dúvidas with the question and both answers. */
function askWhyWrong() {
  const q = question.value
  if (!q) return
  useChatStore().ask({
    topicId: quiz.value?.topic?.id,
    topicName: quiz.value?.topic?.name,
    cardFront: escapeHtml(q.stem),
    source: 'quiz_error',
  }, `Por que errei esta questão? "${q.stem}" Eu respondi "${formatAnswer(q, q.user_answer)}" e a correta é "${formatAnswer(q, q.correct_answer)}".`)
}

async function load() {
  state.value = 'loading'
  try {
    let current = await quizStore.fetchQuiz(quizId.value)
    if (current.status === 'completed') return navigateTo(`/simulados/${quizId.value}/resultado`, { replace: true })
    if (current.status === 'configuring') {
      state.value = 'generating'
      current = await quizStore.pollUntilReady(quizId.value).catch(() => quizStore.currentQuiz ?? current)
    }
    if (current.status === 'failed' || current.status === 'configuring') {
      state.value = 'failed'
      return
    }
    if (current.status === 'in_progress' && !current.started_at) {
      await quizStore.startQuiz(quizId.value)
    } else if (current.time_limit_seconds) {
      // Resuming: the timer continues from the time spent
      quizStore.timeRemaining = Math.max(0, current.time_limit_seconds - (current.time_spent_seconds ?? 0))
      quizStore.startTimer()
    }
    const firstOpen = quizStore.questions.findIndex(q => q.user_answer == null)
    quizStore.goToQuestion(firstOpen >= 0 ? firstOpen : 0)
    state.value = 'answering'
    if (shortfall.value > 0) useAnalytics().track('quiz_shortfall', { requested: requested.value, delivered: questions.value.length })
  } catch (e) {
    if (quizStore.currentQuiz?.status === 'failed') {
      state.value = 'failed'
      return
    }
    reportApiError(e, { silent: true })
    state.value = 'error'
  }
}

// The timer of the Prova mode ends the quiz in the store: open the result
watch(() => quiz.value?.status, (s) => {
  if (s === 'completed' && state.value === 'answering') void navigateTo(`/simulados/${quizId.value}/resultado`, { replace: true })
})

/** 1–5 / A–E choose, Enter confirms, ←/→ move (capture: the arrows never change a radio here; ↑/↓ still do). */
function onKeydown(e: KeyboardEvent) {
  if (state.value !== 'answering' || !question.value || e.ctrlKey || e.metaKey || e.altKey) return
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
  const target = e.target as HTMLElement | null
  const typing = !!target?.closest('textarea, input:not([type="radio"]), [contenteditable="true"]')
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (typing) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'ArrowLeft') quizStore.prevQuestion()
    else quizStore.nextQuestion()
    return
  }
  if (e.key === 'Enter' && !typing) {
    if (target?.closest('button, a')) return
    e.preventDefault()
    if (canAct.value) void primaryAction()
    return
  }
  if (typing || (answered.value && learning.value)) return
  const q = question.value
  const count = q.type === 'true_false' ? 2 : (q.options?.length ?? 0)
  const key = e.key.toLowerCase()
  const index = /^[1-5]$/.test(key) ? Number(key) - 1 : 'abcde'.indexOf(key)
  if (index < 0 || index >= count || key.length !== 1) return
  e.preventDefault()
  selection.value = q.type === 'true_false' ? (index === 0 ? 'true' : 'false') : q.options![index]!
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown, true)
  if (!topicStore.tree.length) void topicStore.fetchTree()
  void load()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true)
  quizStore.stopTimer()
})
</script>
