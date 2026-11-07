<template>
  <div class="flex flex-col gap-4" :data-testid="`question-editor-${index}`">
    <p v-if="warning" class="rounded-row bg-subtle px-3 py-2 text-meta text-fg" role="status" data-testid="question-warning">{{ warning }}</p>

    <UiRadioGroup
      :model-value="q.kind"
      :options="KINDS"
      label="Tipo"
      variant="cards"
      :columns="3"
      @update:model-value="setKind"
    />

    <UiTextarea
      :model-value="q.stem"
      :label="q.kind === 'true_false' ? 'Afirmação' : 'Enunciado'"
      :rows="5"
      :maxlength="LIMITS.stem"
      :error="errors.stem"
      data-testid="question-stem"
      @update:model-value="set({ stem: $event })"
    />

    <!-- Multiple choice: the alternatives, then the key among them -->
    <fieldset v-if="q.kind === 'multiple_choice'" class="flex min-w-0 flex-col gap-2">
      <legend class="mb-2 text-meta font-semibold text-fg-strong">Alternativas</legend>
      <div v-for="(alt, i) in q.alternatives" :key="i" class="flex items-start gap-2">
        <span class="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-tag bg-subtle text-meta font-semibold text-fg-strong" aria-hidden="true">{{ alt.letter }}</span>
        <UiInput
          :model-value="alt.text"
          :label="`Alternativa ${alt.letter}`"
          hide-label
          class="min-w-0 flex-1"
          :maxlength="LIMITS.alternative"
          :error="errors[`alternatives.${i}.text`]"
          :data-testid="`question-alt-${alt.letter}`"
          @update:model-value="setAlternative(i, $event)"
        />
        <UiIconButton :icon="X" :label="`Remover a alternativa ${alt.letter}`" size="sm" class="mt-1" @click="removeAlternative(i)" />
      </div>
      <p v-if="errors.alternatives" class="text-meta text-danger" role="alert">{{ errors.alternatives }}</p>
      <div>
        <UiButton v-if="q.alternatives.length < 6" size="sm" variant="ghost" :icon-left="Plus" data-testid="question-add-alt" @click="addAlternative">Alternativa</UiButton>
      </div>
    </fieldset>

    <div v-if="q.kind === 'multiple_choice' && q.alternatives.length">
      <UiRadioGroup :model-value="q.answer" :options="letterOptions" label="Gabarito" data-testid="question-answer" @update:model-value="set({ answer: $event })" />
      <p v-if="errors.answer" class="mt-1 text-meta text-danger" role="alert">{{ errors.answer }}</p>
    </div>
    <div v-else-if="q.kind === 'true_false'">
      <UiRadioGroup :model-value="q.answer" :options="TF_OPTIONS" label="Gabarito" variant="cards" :columns="2" data-testid="question-answer" @update:model-value="set({ answer: $event })" />
      <p v-if="errors.answer" class="mt-1 text-meta text-danger" role="alert">{{ errors.answer }}</p>
    </div>
    <UiTextarea
      v-else-if="q.kind === 'open'"
      :model-value="q.answer"
      label="Resposta esperada"
      :rows="3"
      :maxlength="LIMITS.openAnswer"
      :error="errors.answer"
      data-testid="question-answer"
      @update:model-value="set({ answer: $event })"
    />

    <UiTextarea
      :model-value="q.explanation"
      label="Comentário"
      optional
      :rows="3"
      :maxlength="LIMITS.explanation"
      hint="Vai no verso do card."
      :error="errors.explanation"
      @update:model-value="set({ explanation: $event })"
    />

    <fieldset class="min-w-0">
      <legend class="mb-2 text-meta font-semibold text-fg-strong">Por que errei <span class="font-normal text-fg-muted">(opcional)</span></legend>
      <div class="mb-2 flex flex-wrap gap-2">
        <button
          v-for="r in REASONS"
          :key="r.value"
          type="button"
          class="inline-flex min-h-touch items-center rounded-control border px-3 text-meta font-medium transition-colors duration-nav"
          :class="q.error_reason === r.value ? 'border-action bg-action-subtle text-action-fg' : 'border-line-strong bg-raised text-fg hover:bg-subtle'"
          :aria-pressed="q.error_reason === r.value"
          :data-testid="`question-reason-${r.value}`"
          @click="set({ error_reason: q.error_reason === r.value ? '' : r.value })"
        >
          {{ r.label }}
        </button>
      </div>
      <UiInput
        :model-value="q.error_note"
        label="O que te pegou"
        hide-label
        placeholder="Ex.: troquei ADI por ADC…"
        :maxlength="LIMITS.errorNote"
        :error="errors.error_note"
        @update:model-value="set({ error_note: $event })"
      />
    </fieldset>

    <UiInput
      :model-value="q.source"
      label="Fonte"
      optional
      placeholder="Ex.: FGV · 2023 · TJ-RJ…"
      :maxlength="LIMITS.source"
      :error="errors.source"
      @update:model-value="set({ source: $event })"
    />
  </div>
</template>

<script setup lang="ts">
// One pasted question to check before it becomes a card (prd-questao-errada RF-F2): what the parser found,
// every field editable. The key is a radio (a letter, Certo/Errado) or the expected answer; "Por que errei"
// reuses the four reasons of the error diary.
import { Plus, X } from 'lucide-vue-next'
import type { RadioOption } from '~/components/ui/RadioGroup.vue'
import type { QuestionDraft } from '~/utils/questionDraft'
import { QUESTION_LIMITS as LIMITS, ERROR_REASONS as REASONS, relabel, draftWarning } from '~/utils/questionDraft'

const props = defineProps<{
  modelValue: QuestionDraft
  index: number
  /** Errors of this question, by field (stem, answer, alternatives.0.text…) */
  errors: Record<string, string>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: QuestionDraft): void }>()

const q = computed(() => props.modelValue)
const set = (patch: Partial<QuestionDraft>) => emit('update:modelValue', { ...props.modelValue, ...patch })

const KINDS: RadioOption[] = [
  { value: 'multiple_choice', label: 'Múltipla escolha' },
  { value: 'true_false', label: 'Certo ou errado' },
  { value: 'open', label: 'Discursiva' },
]
const TF_OPTIONS: RadioOption[] = [{ value: 'certo', label: 'Certo' }, { value: 'errado', label: 'Errado' }]

const letterOptions = computed<RadioOption[]>(() => q.value.alternatives.map(a => ({
  value: a.letter,
  marker: a.letter,
  label: a.text.trim() ? (a.text.length > 90 ? `${a.text.slice(0, 90)}…` : a.text) : '(sem texto)',
})))

const warning = computed(() => draftWarning(q.value))

function setKind(kind: string) {
  const next = kind as QuestionDraft['kind']
  if (next === q.value.kind) return
  const alternatives = next === 'multiple_choice' && !q.value.alternatives.length
    ? relabel([{ letter: 'A', text: '' }, { letter: 'B', text: '' }])
    : q.value.alternatives
  set({ kind: next, alternatives, answer: '' })
}

function setAlternative(i: number, text: string) {
  set({ alternatives: q.value.alternatives.map((a, j) => (j === i ? { ...a, text } : a)) })
}

function addAlternative() {
  set({ alternatives: relabel([...q.value.alternatives, { letter: '', text: '' }]) })
}

function removeAlternative(i: number) {
  const removed = q.value.alternatives[i]!.letter
  const kept = q.value.alternatives.filter((_, j) => j !== i)
  const relabeled = relabel(kept)
  // The key follows its alternative to the new letter; the removed one leaves no key
  let answer = ''
  if (q.value.answer && q.value.answer !== removed) {
    const at = kept.findIndex(a => a.letter === q.value.answer)
    answer = at >= 0 ? relabeled[at]!.letter : ''
  }
  set({ alternatives: relabeled, answer })
}
</script>
