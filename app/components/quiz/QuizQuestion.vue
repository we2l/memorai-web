<template>
  <article class="flex flex-col gap-5" :aria-labelledby="stemId" data-testid="quiz-question">
    <div class="flex flex-wrap items-center gap-2">
      <UiTag>{{ TYPE_LABELS[question.type] }}</UiTag>
      <UiTag v-if="topicName">{{ topicName }}</UiTag>
    </div>
    <p :id="stemId" class="text-body whitespace-pre-line text-fg-strong">{{ question.stem }}</p>

    <UiTextarea
      v-if="question.type === 'short_answer'"
      :model-value="modelValue ?? ''"
      label="Sua resposta"
      :rows="5"
      :disabled="locked"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <!-- Corrected: no longer a form; each card says its state in words -->
    <ul v-else-if="corrected" class="flex flex-col gap-2" aria-label="Alternativas corrigidas">
      <li
        v-for="o in options"
        :key="o.value"
        class="flex items-start gap-3 rounded-control border p-3"
        :class="o.tone ? TONES[o.tone] : TONE_REST"
      >
        <span class="flex size-6 shrink-0 items-center justify-center rounded-tag bg-raised text-meta font-semibold text-fg-strong" aria-hidden="true">{{ o.marker }}</span>
        <span class="min-w-0">
          <span class="block text-body text-fg-strong">{{ o.label }}</span>
          <span v-if="o.description" class="block text-meta font-semibold" :class="o.tone === 'success' ? 'text-success' : 'text-danger'">{{ o.description }}</span>
        </span>
      </li>
    </ul>
    <UiRadioGroup
      v-else
      :model-value="modelValue ?? ''"
      :options="options"
      label="Alternativas"
      hide-label
      variant="cards"
      :disabled="locked"
      :name="`q-${question.id}`"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- Treino: the correction right away, in words and an icon, not only color (RF-F3) -->
    <div v-if="corrected" role="status" class="flex flex-col gap-2 rounded-row px-4 py-3" :class="question.is_correct ? 'bg-success-subtle' : 'bg-danger-subtle'" data-testid="quiz-feedback">
      <p class="flex items-center gap-2 font-semibold" :class="question.is_correct ? 'text-success' : 'text-danger'">
        <CheckCircle2 v-if="question.is_correct" class="size-5 shrink-0" aria-hidden="true" />
        <XCircle v-else class="size-5 shrink-0" aria-hidden="true" />
        {{ question.is_correct ? 'Certo!' : `Errado. A correta é ${correctLabel}.` }}
      </p>
      <p v-if="question.explanation" class="text-meta text-fg">{{ question.explanation }}</p>
      <UiButton v-if="!question.is_correct" size="sm" variant="ghost" :icon-left="MessageCircle" class="-ml-3 self-start" @click="emit('ask')">Por que errei?</UiButton>
    </div>
    <p v-else-if="savedForLater" role="status" class="rounded-row bg-subtle px-4 py-3 text-meta text-fg">
      {{ question.type === 'short_answer' ? 'Resposta salva. A dissertativa é corrigida no fim.' : 'Resposta salva. O gabarito aparece no fim.' }}
    </p>
  </article>
</template>

<script setup lang="ts">
// One question (prd-4e-praticar-v3 RF-F3): the stem, the alternatives as cards with their letter (A–E, keys
// 1–5/A–E on the page) and, in the Treino mode, the correction with the explanation and "Por que errei?".
// After the correction the cards keep the state: the right one in success, the wrong pick in danger, each
// with the words "Correta" / "Sua resposta".
import { CheckCircle2, MessageCircle, XCircle } from 'lucide-vue-next'
import type { QuizQuestion } from '~/types'
import { answerLetter, optionParts } from '~/utils/quizAnswer'

const props = defineProps<{
  question: QuizQuestion
  modelValue: string | null
  /** Treino (learning) corrects each question; Prova (exam) at the end */
  learning: boolean
  topicName?: string | null
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string]; ask: [] }>()

const TYPE_LABELS: Record<QuizQuestion['type'], string> = { multiple_choice: 'Múltipla escolha', true_false: 'Verdadeiro ou falso', short_answer: 'Dissertativa' }

const stemId = useId()
const answered = computed(() => props.question.user_answer !== null)
const corrected = computed(() => props.learning && answered.value && props.question.is_correct !== null && props.question.type !== 'short_answer')
const savedForLater = computed(() => answered.value && !corrected.value)
const locked = computed(() => props.learning && answered.value)

const correctLetter = computed(() => answerLetter(props.question, props.question.correct_answer ?? ''))

interface AnswerOption { value: string; label: string; marker: string; tone?: 'success' | 'danger'; description?: string }
const TONE_REST = 'border-line bg-raised'
const TONES = { success: 'border-success bg-success-subtle', danger: 'border-danger bg-danger-subtle' }

const options = computed<AnswerOption[]>(() => {
  const q = props.question
  const raw = q.type === 'true_false'
    ? [{ value: 'true', marker: 'A', text: 'Verdadeiro' }, { value: 'false', marker: 'B', text: 'Falso' }]
    : (q.options ?? []).map((o, i) => ({ value: o, ...optionParts(o, i) }))
  return raw.map((o) => {
    if (!corrected.value) return { value: o.value, label: o.text, marker: o.marker }
    const isCorrect = answerLetter(q, o.value) === correctLetter.value
    const isPick = o.value === q.user_answer
    return {
      value: o.value,
      label: o.text,
      marker: o.marker,
      tone: isCorrect ? 'success' : (isPick ? 'danger' : undefined),
      description: isCorrect ? (isPick ? 'Sua resposta · correta' : 'Correta') : (isPick ? 'Sua resposta' : undefined),
    }
  })
})

const correctLabel = computed(() => {
  const opt = options.value.find(o => answerLetter(props.question, o.value) === correctLetter.value)
  return opt ? `${opt.marker}) ${opt.label}` : (props.question.correct_answer ?? '')
})
</script>
