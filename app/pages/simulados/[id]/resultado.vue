<template>
  <div class="mx-auto flex max-w-page flex-col gap-5 px-gutter pt-2 pb-6 md:pt-8">
    <UiLink v-if="scope" :to="scope.to" variant="muted" standalone class="-ml-1 self-start px-1">
      <ChevronLeft class="size-4" aria-hidden="true" />
      {{ scope.name }}
    </UiLink>

    <div v-if="state === 'loading'" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only">Carregando o resultado…</span>
      <UiSkeleton variant="block" size="lg" />
      <UiSkeleton variant="block" />
      <UiSkeleton variant="row" />
    </div>

    <!-- Never an endless spinner (03 Q14): the error says it and retries -->
    <UiErrorState v-else-if="state === 'error'" variant="hero" title="Não foi possível carregar o resultado" description="Verifique sua conexão e tente de novo." @retry="load" />

    <!-- E2 (ADR-035 §9): the score, the subjects and the answer key in the main column; the next step and the errors that
         become cards on the side (first on the phone) -->
    <UiSplit v-else-if="quiz" side-label="Próximo passo">
      <template #side>
        <QuizNextStep
          :state="nextState"
          :selected="selected.length"
          :cards-count="cardsCount"
          :session-count="sessionCount"
          :creating="creating"
          :review-to="reviewPath({ type: 'quiz', id: quiz.id })"
          :new-quiz-to="newQuizPath"
          :scope-to="scope?.to"
          :scope-name="scope?.name"
          @create="createCards"
          @review="trackReview"
        />
        <QuizErrorCards v-if="errors.length" v-model="selected" :errors="errors" />
      </template>
      <QuizScore :quiz="quiz" :scope-name="quiz.topic?.name" />
      <QuizByTopic v-if="byTopic.length" :rows="byTopic" />
      <QuizAnswerKey ref="answerKey" :questions="questions" :initially-open="/^#q\d+$/.test(route.hash)" @ask="askWhyWrong" />
      <UiButton v-if="wrongCount > 0" variant="ghost" class="self-start" :loading="retrying" data-testid="quiz-retry-errors" @click="retryErrors">
        Refazer as que errei ({{ wrongCount }})
      </UiButton>
    </UiSplit>
  </div>
</template>

<script setup lang="ts">
// Result of a quiz (prd-4e-praticar-v3 RF-F4, canvas Questoes): the score against the last time, the
// accuracy by assunto, the errors that become cards (chosen, each in its assunto), the next step as the one
// tinted block ("Criar N cards" → "Revisar os N agora", scope=quiz:), the answer key folded and "Refazer as
// que errei" (copies, no AI and no quota).
import { ChevronLeft } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'
import { cadernoPath } from '~/utils/scope'
import { reviewPath } from '~/utils/reviewScope'
import { formatAnswer } from '~/utils/quizAnswer'

useHead({ title: 'Resultado · Baigi' })

const route = useRoute()
const quizStore = useQuizStore()
const quizId = computed(() => String(route.params.id))

const state = ref<'loading' | 'error' | 'ready'>('loading')
const quiz = computed(() => (quizStore.currentQuiz?.id === quizId.value ? quizStore.currentQuiz : null))
const questions = computed(() => quizStore.questions)
const byTopic = computed(() => quiz.value?.by_topic ?? [])
const errors = computed(() => quiz.value?.error_cards_preview ?? [])
const wrongCount = computed(() => questions.value.filter(q => q.is_correct === false).length)

/** The scope the quiz came from ("Voltar a …"); a caderno in the trash is not a destination */
const scope = computed(() => {
  const t = quiz.value?.topic
  return t && !t.in_trash ? { to: cadernoPath(t.id), name: t.name } : null
})
const newQuizPath = computed(() => (quiz.value?.topic ? `/simulados?topic_id=${quiz.value.topic.id}` : '/simulados?action=new'))

/** Errors chosen to become cards: every error without a card, by default */
const selected = ref<string[]>([])
const pending = computed(() => errors.value.filter(e => !e.card_id))
watch(pending, (list) => { selected.value = selected.value.filter(id => list.some(e => e.question_id === id)) })

const cardsCount = computed(() => quiz.value?.cards_from_errors?.count ?? errors.value.filter(e => e.card_id).length)
const sessionCount = computed(() => quiz.value?.cards_from_errors?.session_count ?? 0)
const nextState = computed<'create' | 'review' | 'done'>(() => {
  if (pending.value.length && (selected.value.length || !cardsCount.value)) return 'create'
  if (cardsCount.value > 0) return 'review'
  return 'done'
})

const answerKey = ref<{ open: () => void } | null>(null)

async function load() {
  state.value = 'loading'
  try {
    const q = await quizStore.fetchQuiz(quizId.value)
    if (q.status !== 'completed') return navigateTo(`/simulados/${quizId.value}`, { replace: true })
    selected.value = (q.error_cards_preview ?? []).filter(e => !e.card_id).map(e => e.question_id)
    state.value = 'ready'
    // "Ver a questão" of the review (4d): #q7 lands on that question once the key is open
    if (/^#q\d+$/.test(route.hash)) {
      answerKey.value?.open()
      // The list is a lazy chunk: wait for the question to exist (up to 3 s)
      const id = route.hash.slice(1)
      for (let i = 0; i < 30 && !document.getElementById(id); i++) await new Promise(r => setTimeout(r, 100))
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    }
  } catch (e) {
    reportApiError(e, { silent: true })
    state.value = 'error'
  }
}

const creating = ref(false)
async function createCards() {
  if (!quiz.value || !selected.value.length) return
  creating.value = true
  const chosen = [...selected.value]
  try {
    await quizStore.createCardsFromErrors(quiz.value.id, chosen)
    useAnalytics().track('quiz_error_cards', { selected: chosen.length, total: errors.value.length })
    // The preview now carries the card ids (and the session of these cards)
    await quizStore.fetchQuiz(quiz.value.id)
    selected.value = []
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível criar os cards. Tente de novo.' })
  } finally {
    creating.value = false
  }
}

function trackReview() {
  useAnalytics().track('quiz_review_errors_now', { cards: sessionCount.value })
}

const { run: runRetry, pending: retrying } = useApiAction()
async function retryErrors() {
  if (!quiz.value) return
  const retry = await runRetry(() => quizStore.retryErrors(quiz.value!.id), { error: 'Não foi possível montar as questões de novo.' })
  if (!retry) return
  useAnalytics().track('quiz_retry_errors', { errors: wrongCount.value })
  await navigateTo(`/simulados/${retry.id}`)
}

/** "Por que errei?" (prd-navegacao-v3 RF-9): the tira-dúvidas with the question, the answers and the caderno. */
function askWhyWrong(q: QuizQuestion) {
  useChatStore().ask({
    topicId: quiz.value?.topic?.id,
    topicName: quiz.value?.topic?.name,
    cardFront: escapeHtml(q.stem),
    source: 'quiz_error',
  }, `Por que errei esta questão? "${q.stem}" Eu respondi "${formatAnswer(q, q.user_answer)}" e a correta é "${formatAnswer(q, q.correct_answer)}".`)
}

onMounted(load)
</script>
