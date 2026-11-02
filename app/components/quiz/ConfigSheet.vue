<template>
  <UiSheet
    :model-value="modelValue"
    title="Novo simulado"
    description="Questões geradas do material do caderno e dos seus assuntos."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form id="quiz-config" class="flex flex-col gap-5" @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <UiSelect v-model="form.topic_id" label="Caderno" :options="topicOptions" placeholder="Selecione um caderno" />
        <!-- The requirement before the action, and the 422 of POST /quizzes as the same text (RF-F5) -->
        <TopicRequirementNotice :gate="gate" />
      </div>

      <UiSelect v-model="quantity" label="Questões" :options="quantityOptions" />

      <fieldset class="min-w-0">
        <legend class="mb-1 text-meta font-semibold text-fg-strong">Tipos de questão</legend>
        <UiCheckbox v-model="types.multiple_choice" label="Múltipla escolha" />
        <UiCheckbox v-model="types.true_false" label="Verdadeiro / Falso" />
        <UiCheckbox
          v-model="types.short_answer"
          label="Dissertativa curta"
          :description="allowShortAnswer ? undefined : 'No plano Pro'"
          :disabled="!allowShortAnswer"
        />
      </fieldset>

      <UiRadioGroup v-model="form.mode" label="Modo" :options="MODES" variant="cards" :columns="2" />

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <UiSelect v-model="timeLimit" label="Timer" :options="TIMERS" />
        <UiSelect v-model="form.difficulty" label="Dificuldade" :options="DIFFICULTIES" />
      </div>

      <p class="text-meta text-fg-muted">{{ summary }}</p>
    </form>

    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="quiz-config" :loading="generating" :disabled="!canSubmit">
        {{ generating ? 'Gerando...' : 'Gerar simulado' }}
      </UiButton>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
import { flattenTopics } from '~/utils/topics'

const props = defineProps<{
  modelValue: boolean
  /** Scope it opens with: the caderno the person came from (/simulados?topic_id=, RF-F1) */
  topicId?: string | null
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; created: [quiz: any] }>()

const quizStore = useQuizStore()
const topicStore = useTopicStore()
const auth = useAuthStore()

const isFree = computed(() => auth.user?.plan === 'free')

// The backend enforces the gate (CreateQuizRequest); the UI only mirrors the catalog (RN-08)
const plans = usePlans()
const planExtras = computed(() => plans.limitOf(isFree.value ? 'free' : 'pro')?.extras ?? null)
const maxQuestions = computed(() => planExtras.value?.quiz_max_questions ?? Infinity)
const allowShortAnswer = computed(() => planExtras.value?.quiz_short_answer ?? !isFree.value)

const topicOptions = computed(() => flattenTopics(topicStore.tree).map(t => ({ value: t.id, label: t.name })))

const QUANTITIES = [5, 10, 20, 30, 50]
const quantityOptions = computed(() => QUANTITIES.map(q => ({
  value: String(q),
  label: q > maxQuestions.value ? `${q} questões · Pro` : `${q} questões`,
  disabled: q > maxQuestions.value,
})))
const MODES = [
  { value: 'learning', label: 'Aprendizado', description: 'Feedback depois de cada questão' },
  { value: 'exam', label: 'Prova', description: 'Gabarito só no final' },
]
const TIMERS = [
  { value: '', label: 'Sem limite' },
  { value: '900', label: '15 minutos' },
  { value: '1800', label: '30 minutos' },
  { value: '3600', label: '60 minutos' },
  { value: '5400', label: '90 minutos' },
]
const DIFFICULTIES = [
  { value: 'easy', label: 'Fácil' },
  { value: 'mixed', label: 'Mista' },
  { value: 'hard', label: 'Difícil' },
]
const TYPE_LABELS: Record<string, string> = { multiple_choice: 'Múltipla escolha', true_false: 'V/F', short_answer: 'Dissertativa' }

const form = reactive({
  topic_id: props.topicId ?? '',
  mode: 'learning',
  difficulty: 'mixed',
})
const quantity = ref('10')
const timeLimit = ref('')
const types = reactive({ multiple_choice: true, true_false: true, short_answer: false })

// Opening again from another caderno takes its scope
watch(() => props.topicId, (id) => { if (id) form.topic_id = id })
watch(allowShortAnswer, (ok) => { if (!ok) types.short_answer = false })

const { gate, blocked, fromError } = useTopicGate(() => form.topic_id || null, 'can_quiz')

const selectedTypes = computed(() => (Object.keys(types) as (keyof typeof types)[]).filter(t => types[t]))
const canSubmit = computed(() => !!form.topic_id && selectedTypes.value.length > 0 && !blocked.value)

const summary = computed(() => {
  const timer = timeLimit.value ? `${Number(timeLimit.value) / 60} min` : 'sem timer'
  const kinds = selectedTypes.value.map(t => TYPE_LABELS[t]).join(' + ') || 'escolha um tipo'
  return `${quantity.value} questões · ${kinds} · ${timer} · modo ${form.mode === 'learning' ? 'aprendizado' : 'prova'}`
})

const generating = ref(false)
async function submit() {
  if (!canSubmit.value) return
  generating.value = true
  try {
    const quiz = await quizStore.createQuiz({
      topic_id: form.topic_id,
      quantity: Number(quantity.value),
      types: selectedTypes.value,
      time_limit: timeLimit.value ? Number(timeLimit.value) : null,
      mode: form.mode,
      difficulty: form.difficulty,
    })
    emit('created', quiz)
  } catch (e) {
    // A requirement (422 with code) becomes the notice under the caderno; anything else, a toast
    if (!fromError(e)) reportApiError(e)
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  plans.fetchPlans()
  if (!topicStore.tree.length) topicStore.fetchTree()
})
</script>
