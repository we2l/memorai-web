<template>
  <UiDialog v-model="model" title="A questão que você errou" :description="question?.source || undefined" size="lg">
    <div v-if="loading" class="flex flex-col gap-2" aria-busy="true">
      <span class="sr-only" role="status">Carregando a questão…</span>
      <UiSkeleton v-for="i in 4" :key="i" variant="row" />
    </div>
    <UiErrorState v-else-if="failed" title="Não foi possível abrir a questão" @retry="load" />

    <div v-else-if="question" class="flex flex-col gap-4" data-testid="question-view">
      <!-- Plain text only (interpolation, never v-html): it is what the person pasted -->
      <p class="whitespace-pre-line text-body text-fg-strong">{{ question.stem }}</p>

      <ol v-if="question.alternatives.length" class="flex flex-col gap-1.5" aria-label="Alternativas">
        <li
          v-for="alt in question.alternatives"
          :key="alt.letter"
          class="flex items-start gap-2 rounded-row px-2 py-1.5"
          :class="alt.letter === question.answer ? 'bg-success-subtle' : ''"
        >
          <span class="flex size-6 shrink-0 items-center justify-center rounded-tag bg-subtle text-meta font-semibold text-fg-strong" aria-hidden="true">{{ alt.letter }}</span>
          <span class="min-w-0 text-body text-fg">
            {{ alt.text }}
            <span v-if="alt.letter === question.answer" class="ml-1 text-meta font-semibold text-success">(gabarito)</span>
          </span>
        </li>
      </ol>

      <p class="text-body font-semibold text-fg-strong" data-testid="question-view-answer">{{ answerLine }}</p>

      <div v-if="question.explanation">
        <h3 class="mb-1 text-meta font-semibold text-fg-strong">Comentário</h3>
        <p class="whitespace-pre-line text-body text-fg">{{ question.explanation }}</p>
      </div>

      <p v-if="reasonLine" class="rounded-row bg-subtle px-3 py-2 text-meta text-fg">Por que errei: {{ reasonLine }}</p>

      <details class="text-meta text-fg-muted">
        <summary class="min-h-touch cursor-pointer py-2 font-medium text-fg">Texto colado</summary>
        <p class="whitespace-pre-line break-words">{{ question.raw_text }}</p>
      </details>
    </div>

    <template #footer="{ close }">
      <UiButton @click="close">Fechar</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// "Ver a questão" after the card turns in the review (prd-questao-errada RF-F5): the question as it was
// pasted and structured, GET /pasted-questions/{id}. The review session stays under it.
import { ERROR_REASONS } from '~/utils/questionDraft'

interface PastedQuestion {
  id: string
  kind: 'multiple_choice' | 'true_false' | 'open'
  stem: string
  alternatives: { letter: string, text: string }[]
  answer: string
  explanation: string | null
  error_reason: string | null
  error_note: string | null
  source: string | null
  raw_text: string
}

const props = defineProps<{ questionId: string | null }>()
const model = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const question = ref<PastedQuestion | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load() {
  if (!props.questionId) return
  loading.value = true
  failed.value = false
  try {
    question.value = (await $api<{ data: PastedQuestion }>(`/pasted-questions/${props.questionId}`)).data
  } catch (err) {
    failed.value = true
    reportApiError(err, { silent: true })
  } finally {
    loading.value = false
  }
}

watch(() => [model.value, props.questionId] as const, ([isOpen, id]) => {
  if (isOpen && id && question.value?.id !== id) void load()
}, { immediate: true })

const answerLine = computed(() => {
  const q = question.value
  if (!q) return ''
  if (q.kind === 'true_false') return `Gabarito: ${q.answer === 'certo' ? 'Certo' : 'Errado'}`
  if (q.kind === 'open') return `Resposta esperada: ${q.answer}`
  return `Gabarito: ${q.answer}`
})

const reasonLine = computed(() => {
  const q = question.value
  if (!q) return ''
  const label = ERROR_REASONS.find(r => r.value === q.error_reason)?.label
  return [label, q.error_note].filter(Boolean).join(' — ')
})
</script>
