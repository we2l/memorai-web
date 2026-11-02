<template>
  <div class="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-20 sm:p-6 lg:pb-6">
    <div v-if="!quiz" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only">Carregando resultado...</span>
      <UiSkeleton variant="block" size="lg" />
      <UiSkeleton variant="row" />
    </div>

    <template v-else>
      <UiPageHeader :title="quiz.title" :back="{ to: '/simulados', label: 'Simulados' }">
        <template #meta>
          <span>{{ quiz.correct_count ?? 0 }} certas · {{ wrongCount }} erradas</span>
          <span v-if="quiz.time_spent_seconds"> · {{ formatTime(quiz.time_spent_seconds) }}</span>
          <span v-if="topic"> · {{ topic.name }}</span>
        </template>
      </UiPageHeader>

      <UiSection>
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <UiStat :value="`${Math.round(quiz.score_percent ?? 0)}%`" label="de acerto" size="lg" />
          <UiTag :tone="scoreTone">{{ scoreLabel }}</UiTag>
        </div>

        <!-- After the cards: the next step in the same scope, not only a toast (RF-F2, N12) -->
        <div v-if="cardsCreated" class="mt-5 flex flex-col gap-3 border-t border-line pt-5" role="status">
          <p class="text-body text-fg-strong">
            <template v-if="createdCount !== null">{{ createdCount }} card{{ createdCount !== 1 ? 's' : '' }} dos erros criado{{ createdCount !== 1 ? 's' : '' }}</template>
            <template v-else>Os cards dos erros já foram criados</template>
            <template v-if="topic"> em {{ topic.name }}</template>.
          </p>
          <p class="text-meta text-fg-muted">
            {{ errorCards ? 'Revise agora só os cards destes erros, fora do limite de novos do dia.' : `${createdCount === 1 ? 'Ele entra como card novo' : 'Eles entram como cards novos'} na revisão do caderno.` }}
          </p>
          <div class="flex flex-wrap gap-3">
            <!-- Exactly the cards of these errors (prd-caderno-f2-recorte RF-F4, closes F1 6.2); an older quiz without the link keeps the caderno session -->
            <UiButton v-if="errorCards" variant="primary" :to="reviewPath({ type: 'quiz', id: quiz.id })">
              Revisar {{ errorCards === 1 ? 'o card' : `os ${errorCards}` }} agora
            </UiButton>
            <UiButton v-else variant="primary" :to="reviewPath(topic?.id)">Revisar agora</UiButton>
            <UiButton v-if="topic" :to="cadernoPath(topic.id, { tab: 'cards' })">Voltar ao caderno</UiButton>
            <UiButton variant="ghost" :to="newQuizPath">Novo simulado</UiButton>
          </div>
        </div>
        <div v-else class="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
          <UiButton variant="primary" :loading="creatingCards" :disabled="wrongCount === 0" @click="createCards">
            {{ wrongCount === 0 ? 'Nenhum erro para virar card' : `Criar cards dos erros (${wrongCount})` }}
          </UiButton>
          <UiButton v-if="topic" :to="cadernoPath(topic.id)">Voltar ao caderno</UiButton>
          <UiButton variant="ghost" :to="newQuizPath">Novo simulado</UiButton>
        </div>
      </UiSection>

      <UiSection v-if="breakdown.length > 1" title="Desempenho por tema">
        <p v-if="weakText" class="-mt-1 mb-4 text-meta text-fg">{{ weakText }}</p>
        <ul class="flex flex-col gap-4">
          <li v-for="item in breakdown" :key="item.tag">
            <div class="mb-1.5 flex justify-between gap-3 text-meta">
              <span class="font-medium text-fg-strong">{{ item.tag }}</span>
              <span class="text-fg-muted">{{ item.correct }}/{{ item.total }}</span>
            </div>
            <UiProgressBar :value="item.percent" :label="`Acerto em ${item.tag}`" tone="neutral" size="md" show-value />
          </li>
        </ul>
      </UiSection>

      <UiSection title="Gabarito">
        <UiTabs
          v-model="filter"
          label="Questões do gabarito"
          :tabs="[{ key: 'all', label: 'Todas', count: questions.length }, { key: 'wrong', label: 'Só erros', count: wrongCount }]"
        >
        <ol class="divide-y divide-line">
          <li v-for="q in filteredQuestions" :key="q.id" class="flex items-start gap-3 py-5">
            <span class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" :class="q.is_correct ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'">
              <CheckCircle2 v-if="q.is_correct" class="size-4" aria-hidden="true" />
              <XCircle v-else class="size-4" aria-hidden="true" />
              <span class="sr-only">{{ q.is_correct ? 'Certa' : 'Errada' }}</span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex flex-wrap items-center gap-2">
                <UiTag>{{ q.position }}</UiTag>
                <UiTag v-if="q.topic_tag">{{ q.topic_tag }}</UiTag>
              </div>
              <p class="text-body text-fg-strong">{{ q.stem }}</p>
              <dl class="mt-3 flex flex-col gap-1.5 text-meta">
                <div v-if="!q.is_correct && q.user_answer" class="flex items-start gap-2">
                  <dt class="shrink-0 font-semibold text-danger">Você:</dt>
                  <dd class="text-fg">{{ formatAnswer(q, q.user_answer) }}</dd>
                </div>
                <div class="flex items-start gap-2">
                  <dt class="shrink-0 font-semibold text-success">Correta:</dt>
                  <dd class="font-medium text-fg-strong">{{ formatAnswer(q, q.correct_answer ?? '') }}</dd>
                </div>
              </dl>
              <p v-if="q.explanation" class="mt-3 border-l-2 border-line pl-3 text-meta text-fg-muted">{{ q.explanation }}</p>
              <p v-if="q.ai_feedback" class="mt-2 text-meta text-fg-muted">Correção IA: {{ q.ai_feedback }} ({{ Math.round((q.ai_score ?? 0) * 100) }}%)</p>
              <UiButton v-if="q.is_correct === false" size="sm" variant="ghost" :icon-left="MessageCircle" class="-ml-3 mt-2" @click="askWhyWrong(q)">
                Por que errei?
              </UiButton>
            </div>
          </li>
        </ol>
        </UiTabs>
      </UiSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, MessageCircle, XCircle } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'
import { cadernoPath } from '~/utils/scope'
import { reviewPath } from '~/utils/reviewScope'

definePageMeta({ layout: 'default' })

const route = useRoute()
const quizStore = useQuizStore()

const filter = ref('all')
const creatingCards = ref(false)
/** Cards created now (the count of this answer); null when they were created on another visit */
const createdCount = ref<number | null>(null)

const quiz = computed(() => quizStore.currentQuiz)
const topic = computed(() => quiz.value?.topic ?? null)
const questions = computed(() => quizStore.questions)
const wrongCount = computed(() => questions.value.filter(q => q.is_correct === false).length)
const cardsCreated = computed(() => createdCount.value !== null || !!quiz.value?.cards_created_at)
/** Session of the cards born from these errors (`scope=quiz:`): 0 = nothing to review now or an older quiz */
const errorCards = computed(() => quiz.value?.cards_from_errors?.session_count ?? 0)
// A new quiz keeps the scope of this one (/simulados?topic_id=, RF-F1)
const newQuizPath = computed(() => (topic.value ? `/simulados?topic_id=${topic.value.id}` : '/simulados'))

const filteredQuestions = computed(() => (filter.value === 'wrong' ? questions.value.filter(q => q.is_correct === false) : questions.value))

const breakdown = computed(() => {
  const map = new Map<string, { correct: number; total: number }>()
  for (const q of questions.value) {
    const tag = q.topic_tag || 'Geral'
    const entry = map.get(tag) ?? { correct: 0, total: 0 }
    entry.total++
    if (q.is_correct) entry.correct++
    map.set(tag, entry)
  }
  return Array.from(map.entries()).map(([tag, data]) => ({
    tag,
    ...data,
    percent: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }))
})

const weakText = computed(() => {
  const weak = breakdown.value.filter(t => t.percent < 50 && t.total >= 2).slice(0, 2)
  if (!weak.length) return null
  return weak.length === 1
    ? `${weak[0]!.tag}: ${weak[0]!.percent}% de acerto. Vale revisar este tema.`
    : `${weak.map(t => t.tag).join(' e ')}: abaixo de 50%. Vale revisar.`
})

const scoreTone = computed(() => {
  const s = quiz.value?.score_percent ?? 0
  if (s >= 70) return 'success' as const
  if (s >= 50) return 'warning' as const
  return 'danger' as const
})
const scoreLabel = computed(() => ({ success: 'Bom resultado', warning: 'Quase lá', danger: 'Precisa de reforço' })[scoreTone.value])

onMounted(async () => {
  await quizStore.fetchQuiz(route.params.id as string)
})

async function createCards() {
  if (!quiz.value?.id) return
  creatingCards.value = true
  try {
    const res = await quizStore.createCardsFromErrors(quiz.value.id)
    // A 2nd call (another tab) creates nothing and answers the same ids: "já foram criados"
    createdCount.value = res.cards_created > 0 ? res.cards_created : null
  } catch (e) {
    reportApiError(e, { error: 'Não foi possível criar os cards. Tente de novo.' })
  } finally {
    creatingCards.value = false
  }
}

/** "Por que errei?" (prd-navegacao-v3 RF-9): the tira-dúvidas with the question, the answers and the caderno. */
function askWhyWrong(q: QuizQuestion) {
  const answered = q.user_answer ? formatAnswer(q, q.user_answer) : 'nada'
  useChatStore().ask({
    topicId: topic.value?.id,
    topicName: topic.value?.name,
    cardFront: escapeHtml(q.stem),
    source: 'quiz_error',
  }, `Por que errei esta questão? "${q.stem}" Eu respondi "${answered}" e a correta é "${formatAnswer(q, q.correct_answer ?? '')}".`)
}

function formatAnswer(q: QuizQuestion, answer: string) {
  if (q.type === 'true_false') return answer === 'true' ? 'Verdadeiro' : 'Falso'
  if (q.type === 'multiple_choice' && q.options) {
    const letter = answer.toLowerCase().trim()
    const match = q.options.find(o => o.toLowerCase().startsWith(letter + ')'))
    if (match) return match
  }
  return answer
}
</script>
