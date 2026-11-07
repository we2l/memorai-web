<template>
  <UiSheet
    :model-value="modelValue"
    title="Novas questões"
    description="Questões geradas do material do caderno, no assunto que você escolher."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <UiTabs v-model="tab" label="Tipo de prática" :tabs="TABS">
      <form id="quiz-config" class="flex flex-col gap-5" @submit.prevent="submit">
        <!-- Bateria: a scope of any level or one material, N questions (RF-F2) -->
        <template v-if="tab === 'battery'">
          <div class="flex flex-col gap-2">
            <UiSelect v-model="topicId" label="Escopo" :options="scopeOptions" placeholder="Escolha o caderno ou o assunto" data-testid="quiz-scope" />
            <UiSelect
              v-if="materialOptions.length > 1"
              v-model="material"
              label="Material"
              :options="materialOptions"
              hint="Opcional: as questões saem só deste PDF ou desta nota."
              data-testid="quiz-material"
            />
            <!-- The requirement before the action, and the 422 of POST /quizzes as the same text (F1 RF-F5) -->
            <TopicRequirementNotice :gate="gate" />
          </div>

          <UiSelect v-model="count" label="Questões" :options="batteryCounts" data-testid="quiz-count" />

          <fieldset class="min-w-0">
            <legend class="mb-1 text-meta font-semibold text-fg-strong">Tipos de questão</legend>
            <UiCheckbox v-model="types.multiple_choice" label="Múltipla escolha" />
            <UiCheckbox v-model="types.true_false" label="Verdadeiro ou falso" />
            <UiCheckbox
              v-model="types.short_answer"
              label="Dissertativa curta"
              :description="allowShortAnswer ? 'Corrigida no fim, com comentário' : `No ${proName}`"
              :disabled="!allowShortAnswer"
            />
          </fieldset>

          <UiRadioGroup v-model="mode" label="Modo" :options="MODES" variant="cards" :columns="2" />
          <UiSelect v-model="difficulty" label="Dificuldade" :options="DIFFICULTIES" />
        </template>

        <!-- Simulado do caderno: split by matéria, timer, Prova mode (RF-F2, RF-B2) -->
        <template v-else>
          <div class="flex flex-col gap-2">
            <UiSelect v-model="topicId" label="Caderno ou matéria" :options="examScopeOptions" placeholder="Escolha o caderno" data-testid="quiz-scope" />
            <TopicRequirementNotice :gate="gate" />
          </div>
          <UiSelect v-model="examCount" label="Questões" :options="examCounts" data-testid="quiz-count" />
          <UiSelect v-model="timer" label="Cronômetro" :options="timerOptions" :hint="`Sugestão: 3 minutos por questão (${timerLabel(suggestedTimer(Number(examCount)))})`" />
          <div class="rounded-row bg-subtle px-3 py-2.5 text-meta" data-testid="quiz-distribution">
            <p class="font-semibold text-fg-strong">Como as questões se dividem</p>
            <p class="text-fg">{{ distributionText }}</p>
            <p class="mt-1 text-fg-muted">Modo Prova: o gabarito aparece no fim. Proporcional aos cards de cada matéria.</p>
          </div>
          <div v-if="isFree" class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p class="text-meta text-fg-muted">O simulado do caderno, de 30 a 120 questões, é do {{ proName }}.</p>
            <UiButton size="sm" variant="ghost" :icon-left="Lock" @click="openUpgrade">Conhecer o {{ proName }}</UiButton>
          </div>
        </template>
      </form>
    </UiTabs>

    <template #footer="{ close }">
      <p v-if="quotaText" class="mr-auto text-label text-fg-muted" data-testid="quiz-quota">{{ quotaText }}</p>
      <LazyPlansUsageNotice v-else feature="quiz_ai" :usage="usage" class="mr-auto" />
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="quiz-config" :loading="generating" :disabled="!canSubmit" data-testid="quiz-submit">
        {{ submitLabel }}
      </UiButton>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
// Config of a practice of questions (prd-4e-praticar-v3 RF-F2): two tabs, Bateria (a caderno, matéria,
// assunto or one material; 10–50 questions) and Simulado (a caderno or matéria split by matéria in proportion
// to its cards, with a timer, always in Prova mode). The quota and the requirement are said before; the one
// primary says how many questions it generates. The API enforces every limit (CreateQuizRequest).
import { Lock } from 'lucide-vue-next'
import type { MaterialsPage, Quiz, Topic } from '~/types'
import { subtreeSum, topicTreeOptions } from '~/utils/topicOptions'
import { distributionLabel, EXAM_TIMERS, splitQuestions, suggestedTimer, timerLabel } from '~/utils/quizDistribution'

type Tab = 'battery' | 'exam'

const props = defineProps<{
  modelValue: boolean
  /** Scope it opens with: the caderno/assunto the person came from (?topic_id=) */
  topicId?: string | null
  /** A material as the scope: "document:<id>" or "note:<id>" */
  scope?: string | null
  tab?: Tab
  /** Questions it opens with ("20 questões do pior assunto", the end of a review batch: 10) */
  quantity?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; created: [quiz: Quiz] }>()

const { $api } = useNuxtApp()
const quizStore = useQuizStore()
const topicStore = useTopicStore()
const auth = useAuthStore()

// The trial has the Pro's gates (50 questions, short answer, the simulado do caderno: RN-03)
const isFree = computed(() => !!auth.user && !auth.hasProAccess)
const proName = useProName()
const plans = usePlans()
const planExtras = computed(() => plans.limitOf(isFree.value ? 'free' : 'pro')?.extras ?? null)
const maxQuestions = computed(() => planExtras.value?.quiz_max_questions ?? (isFree.value ? 10 : 50))
const allowShortAnswer = computed(() => planExtras.value?.quiz_short_answer ?? !isFree.value)

const TABS = [{ key: 'battery', label: 'Bateria' }, { key: 'exam', label: 'Simulado' }]
const MODES = [
  { value: 'learning', label: 'Treino', description: 'Corrige a cada questão' },
  { value: 'exam', label: 'Prova', description: 'Corrige no fim' },
]
const DIFFICULTIES = [
  { value: 'mixed', label: 'Mista' },
  { value: 'easy', label: 'Fácil' },
  { value: 'hard', label: 'Difícil' },
]
const BATTERY_COUNTS = [10, 20, 30, 50]
const EXAM_COUNTS = [30, 60, 90, 120]

const tab = ref<Tab>(props.tab ?? 'battery')
const topicId = ref(props.topicId ?? '')
const material = ref(props.scope ?? '')
const count = ref(String(props.quantity ?? 10))
const examCount = ref('60')
const timer = ref(String(suggestedTimer(60)))
const mode = ref('learning')
const difficulty = ref('mixed')
const types = reactive({ multiple_choice: true, true_false: true, short_answer: false })

// Opening again from another place takes its scope, tab and size
watch(() => [props.modelValue, props.topicId, props.scope, props.tab, props.quantity] as const, ([open]) => {
  if (!open) return
  if (props.topicId) topicId.value = props.topicId
  material.value = props.scope ?? ''
  if (props.tab) tab.value = props.tab
  if (props.quantity) count.value = String(props.quantity)
})
watch(allowShortAnswer, (ok) => { if (!ok) types.short_answer = false })
// The timer follows the size (3 min per question) until the person picks another one
let timerTouched = false
watch(timer, (v) => { if (v !== String(suggestedTimer(Number(examCount.value)))) timerTouched = true })
watch(examCount, (n) => { if (!timerTouched) timer.value = String(suggestedTimer(Number(n))) })

const scopeOptions = computed(() => topicTreeOptions(topicStore.tree))
const examScopeOptions = computed(() => topicTreeOptions(topicStore.tree, 1))
// A simulado takes a caderno or a matéria: an assunto chosen in the Bateria falls back to its matéria
watch(tab, (t) => {
  if (t === 'exam' && topicId.value && !examScopeOptions.value.some(o => o.value === topicId.value)) {
    const topic = topicStore.findById(topicId.value)
    topicId.value = topic?.parent_id ?? ''
  }
})

const batteryCounts = computed(() => BATTERY_COUNTS.map(q => ({
  value: String(q),
  label: q > maxQuestions.value ? `${q} questões · No ${proName.value}: até 50` : `${q} questões`,
  disabled: q > maxQuestions.value,
})))
// Free: max_exam_questions is 10 on the API, below every size of the simulado do caderno
const examCounts = computed(() => EXAM_COUNTS.map(q => ({ value: String(q), label: isFree.value ? `${q} questões · No ${proName.value}` : `${q} questões`, disabled: isFree.value })))
const timerOptions = EXAM_TIMERS.map(t => ({ value: String(t), label: timerLabel(t) }))

// Materials of the chosen scope (GET /topics/{id}/materials, first page): "Um material…"
const materials = shallowRef<MaterialsPage['data']>([])
let materialsSeq = 0
watch(() => (props.modelValue && tab.value === 'battery' ? topicId.value : ''), async (id) => {
  const n = ++materialsSeq
  materials.value = []
  if (!id) return
  try {
    const res = await $api<MaterialsPage>(`/topics/${id}/materials`, { params: { limit: 30 } })
    if (n === materialsSeq) materials.value = res.data.filter(m => m.status === 'ready' && (m.kind === 'pdf' || m.note_id))
  } catch (e) {
    // The scope still works without the list (the whole caderno or assunto)
    reportApiError(e, { silent: true })
  }
}, { immediate: true })
const materialOptions = computed(() => {
  const name = topicStore.findById(topicId.value)?.name
  return [
    { value: '', label: name ? `Todo o escopo (${name})` : 'Todo o escopo' },
    ...materials.value.map(m => ({ value: m.kind === 'pdf' ? `document:${m.id}` : `note:${m.note_id}`, label: m.kind === 'pdf' ? `PDF · ${m.title}` : `Nota · ${m.title}` })),
  ]
})
watch(materialOptions, (opts) => { if (material.value && !opts.some(o => o.value === material.value) && materials.value.length) material.value = '' })

// The preview of the split, by the same rule as the API: the matérias with material, weighed by cards
const distribution = computed(() => {
  const topic = topicStore.findById(topicId.value) as Topic | null
  if (!topic) return []
  const withMaterial = (topic.children ?? []).filter(c => subtreeSum(c, t => t.notes_count ?? 0) > 0)
  const rows = withMaterial.length ? withMaterial : [topic]
  const split = splitQuestions(Number(examCount.value), rows.map(c => ({ id: c.id, cards: subtreeSum(c, t => t.flashcards_count ?? 0) })))
  return rows.map(c => ({ name: c.name, questions: split.get(c.id) ?? 0 }))
})
const distributionText = computed(() => (topicId.value ? distributionLabel(distribution.value) || 'Escolha um caderno com material' : 'Escolha um caderno para ver a divisão'))

const { gate, blocked, fromError } = useTopicGate(() => (props.modelValue ? topicId.value || null : null), 'can_quiz')

// The quota before the action: "1 de 3 gerações no teste" (the Pro has no cap on questions). A Free account
// whose trial is available goes to the server, which opens the trial (RF-F7b): no "0 de 0" and no block.
const usage = usePaidQuota()
const quota = computed(() => usage.usage.value?.features?.quiz_ai ?? null)
const quotaText = computed(() => {
  const q = quota.value
  // The paid plan: only the 80% line and the limit (PlansUsageNotice, prd-uso-justo RF-F3)
  if (!q || !q.limit || usage.opensTrial('quiz_ai') || usage.paid.value) return null
  return `${q.used} de ${q.limit} ${q.limit === 1 ? 'geração' : 'gerações'} ${usage.periodLabel.value}`
})
const quotaSpent = computed(() => !usage.canUse('quiz_ai'))

const selectedTypes = computed(() => (Object.keys(types) as (keyof typeof types)[]).filter(t => types[t]))
const quantity = computed(() => Number(tab.value === 'exam' ? examCount.value : count.value))
const canSubmit = computed(() => {
  if (!topicId.value || blocked.value || generating.value || usage.atLimit('quiz_ai')) return false
  if (tab.value === 'exam') return !isFree.value
  return selectedTypes.value.length > 0
})
const submitLabel = computed(() => {
  if (generating.value) return 'Gerando...'
  if (quotaSpent.value && !usage.paid.value) return `Ver o ${proName.value}`
  return tab.value === 'exam' ? `Gerar simulado de ${quantity.value}` : `Gerar ${quantity.value} questões`
})

function openUpgrade() {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: usage.limitDetail('quiz_ai') }))
}

const generating = ref(false)
async function submit() {
  if (quotaSpent.value) return openUpgrade()
  if (!canSubmit.value) return
  const exam = tab.value === 'exam'
  const scope = !exam && material.value ? material.value : `topic:${topicId.value}`
  generating.value = true
  try {
    const quiz = await quizStore.createQuiz(exam
      ? { scope, kind: 'exam', quantity: quantity.value, types: ['multiple_choice'], mode: 'exam', time_limit: Number(timer.value), difficulty: 'mixed' }
      : { scope, kind: 'battery', quantity: quantity.value, types: selectedTypes.value, mode: mode.value, difficulty: difficulty.value, time_limit: null })
    useAnalytics().track('quiz_config', { kind: exam ? 'exam' : 'battery', count: quantity.value, scope_type: scope.split(':')[0] as 'topic' | 'document' | 'note' })
    emit('created', quiz)
  } catch (e) {
    // A requirement (422 with code) becomes the notice under the scope; anything else, a toast
    if (!fromError(e)) reportApiError(e, { error: 'Não foi possível gerar as questões. Tente de novo.' })
  } finally {
    generating.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  void plans.fetchPlans()
  void usage.fetchUsage()
  if (!topicStore.tree.length) void topicStore.fetchTree()
}, { immediate: true })
</script>
