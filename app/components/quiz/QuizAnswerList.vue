<template>
  <UiTabs
    v-model="filter"
    label="Questões do gabarito"
    :tabs="[{ key: 'all', label: 'Todas', count: questions.length }, { key: 'wrong', label: 'Só erros', count: wrong.length }]"
  >
    <ol class="divide-y divide-hairline">
      <li v-for="q in shown" :id="`q${q.position}`" :key="q.id" class="flex scroll-mt-24 items-start gap-3 py-5">
        <span class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full" :class="q.is_correct ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'">
          <CheckCircle2 v-if="q.is_correct" class="size-4" aria-hidden="true" />
          <XCircle v-else class="size-4" aria-hidden="true" />
          <span class="sr-only">{{ q.is_correct ? 'Certa' : 'Errada' }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-label font-semibold text-fg-muted">Questão {{ q.position }}<template v-if="q.topic_tag"> · {{ q.topic_tag }}</template></p>
          <p class="text-body whitespace-pre-line text-fg-strong">{{ q.stem }}</p>
          <dl class="mt-3 flex flex-col gap-1.5 text-meta">
            <div v-if="!q.is_correct" class="flex items-start gap-2">
              <dt class="shrink-0 font-semibold text-danger">Você:</dt>
              <dd class="text-fg">{{ formatAnswer(q, q.user_answer) }}</dd>
            </div>
            <div class="flex items-start gap-2">
              <dt class="shrink-0 font-semibold text-success">Correta:</dt>
              <dd class="font-medium text-fg-strong">{{ formatAnswer(q, q.correct_answer) }}</dd>
            </div>
          </dl>
          <p v-if="q.explanation" class="mt-3 border-l-2 border-line pl-3 text-meta text-fg-muted">{{ q.explanation }}</p>
          <p v-if="q.ai_feedback" class="mt-2 text-meta text-fg-muted">Correção: {{ q.ai_feedback }} ({{ Math.round((q.ai_score ?? 0) * 100) }}%)</p>
          <UiButton v-if="q.is_correct === false" size="sm" variant="ghost" :icon-left="MessageCircle" class="-ml-3 mt-2" @click="emit('ask', q)">
            Por que errei?
          </UiButton>
        </div>
      </li>
    </ol>
  </UiTabs>
</template>

<script setup lang="ts">
// The questions of the answer key (QuizAnswerKey opens it): all or only the wrong ones, both answers, the
// explanation, the correction of the short answers and "Por que errei?".
import { CheckCircle2, MessageCircle, XCircle } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'
import { formatAnswer } from '~/utils/quizAnswer'

const props = defineProps<{ questions: QuizQuestion[] }>()
const emit = defineEmits<{ ask: [q: QuizQuestion] }>()

const filter = ref('all')
const wrong = computed(() => props.questions.filter(q => q.is_correct === false))
const shown = computed(() => (filter.value === 'wrong' ? wrong.value : props.questions))
</script>
