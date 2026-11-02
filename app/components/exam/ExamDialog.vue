<template>
  <UiDialog :model-value="modelValue" :title="exam ? 'Editar prova' : 'Nova prova'" description="Com a data, a revisão prioriza os assuntos da prova e mostra quanto você deve lembrar no dia." @update:model-value="emit('update:modelValue', $event)">
    <form id="exam-form" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <UiInput v-model="title" label="Nome da prova" placeholder="Ex.: TRF 4ª Região — Analista" :error="errors.title" autocomplete="off" data-testid="exam-title" />
      <UiInput v-model="date" type="date" label="Data da prova" :min="minDate" :error="errors.date" data-testid="exam-date" />

      <div class="flex flex-col gap-3">
        <UiSelect v-model="rootId" label="Caderno" :options="rootOptions" placeholder="Escolha o caderno" :error="errors.coverage" data-testid="exam-root" />
        <UiRadioGroup v-if="rootId && subjects.length" v-model="mode" label="O que cai na prova" :options="MODES" variant="cards" :columns="2" />
        <fieldset v-if="rootId && mode === 'some'" class="min-w-0 rounded-control border border-line-strong px-3 py-2" data-testid="exam-coverage">
          <legend class="px-1 text-meta font-semibold text-fg-strong">Matérias e assuntos</legend>
          <UiCheckbox
            v-for="s in subjects"
            :key="s.id"
            :model-value="picked.includes(s.id)"
            :class="s.depth > 1 && 'pl-6'"
            :disabled="s.depth > 1 && !!s.parentId && picked.includes(s.parentId)"
            @update:model-value="toggle(s.id, $event)"
          >
            {{ s.name }}
          </UiCheckbox>
        </fieldset>
      </div>

      <UiSwitch v-model="retaFinal" label="Reta final nos últimos 3 dias" description="A revisão traz até 20 cards extras dos assuntos da prova." />

      <p v-if="limitError" role="alert" class="flex flex-wrap items-center gap-x-2 rounded-row bg-subtle px-3 py-2 text-meta text-fg" data-testid="exam-limit-error">
        {{ limitError }} <UiLink to="/planos">Conhecer o Pro</UiLink>
      </p>
    </form>

    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="exam-form" :loading="saving" data-testid="exam-save">{{ exam ? 'Salvar' : 'Criar prova' }}</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// Exam as the goal of one caderno (prd-4f-progresso-v3 RF-F9, D9): name, date (from tomorrow), the coverage
// (the whole caderno or some matérias/assuntos of it) and the Reta final. Opened from Progresso, from the
// caderno or matéria (⋯ "Definir prova", with the scope as the coverage) and from ?nova_prova=1. A 422
// coverage_mixed_roots (topics of two cadernos) or the Free limit are said in the dialog, never a raw error.
import type { Exam } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'

const props = defineProps<{
  modelValue: boolean
  /** Editing this exam */
  exam?: Exam | null
  /** Coverage it opens with (the caderno or the matéria of the page) */
  topicIds?: string[]
  origin: 'progress' | 'scope' | 'hoje'
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; saved: [exam: Exam] }>()

const examStore = useExamStore()
const topicStore = useTopicStore()
const toast = useToast()

const MODES = [
  { value: 'all', label: 'O caderno inteiro' },
  { value: 'some', label: 'Algumas matérias' },
]

const title = ref('')
const date = ref('')
const rootId = ref('')
const mode = ref<'all' | 'some'>('all')
const picked = ref<string[]>([])
const retaFinal = ref(true)
const saving = ref(false)
const limitError = ref('')
const errors = reactive<{ title?: string; date?: string; coverage?: string }>({})

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const rootOptions = computed(() => topicStore.tree.map(t => ({ value: t.id, label: t.name })))
/** Matérias and assuntos of the caderno (2 levels), in tree order */
const subjects = computed(() => {
  const root = topicStore.tree.find(t => t.id === rootId.value)
  const out: { id: string; name: string; depth: number; parentId: string | null }[] = []
  for (const m of root?.children ?? []) {
    out.push({ id: m.id, name: m.name, depth: 1, parentId: null })
    for (const a of m.children ?? []) out.push({ id: a.id, name: a.name, depth: 2, parentId: m.id })
  }
  return out
})

/** The root of a topic in the tree */
function rootOf(id: string): string {
  let t = topicStore.findById(id)
  while (t?.parent_id) t = topicStore.findById(t.parent_id)
  return t?.id ?? ''
}

function reset() {
  const ids = props.exam ? (props.exam.coverage?.map(c => c.topic_id) ?? props.exam.topics.map(t => t.id)) : (props.topicIds ?? [])
  title.value = props.exam?.title ?? ''
  date.value = props.exam?.exam_date.slice(0, 10) ?? ''
  rootId.value = ids[0] ? rootOf(ids[0]) : (topicStore.tree.length === 1 ? topicStore.tree[0]!.id : '')
  const whole = !ids.length || ids.includes(rootId.value)
  mode.value = whole ? 'all' : 'some'
  picked.value = whole ? [] : ids
  retaFinal.value = props.exam?.reta_final_enabled ?? true
  limitError.value = ''
  errors.title = errors.date = errors.coverage = undefined
  // A new exam of a scope: the name of the caderno as a start
  if (!props.exam && !title.value && ids[0]) title.value = topicStore.findById(ids[0])?.name ?? ''
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  if (!topicStore.tree.length) void topicStore.fetchTree().then(reset)
  reset()
}, { immediate: true })
// The coverage can arrive after the dialog opened (?from= waits for the agenda)
watch(() => props.topicIds?.join(','), () => { if (props.modelValue && !props.exam) reset() })
watch(rootId, (id, old) => { if (old && id !== old) picked.value = [] })

function toggle(id: string, on: boolean) {
  const set = new Set(picked.value)
  if (on) {
    set.add(id)
    // A matéria covers its assuntos: they leave the list (the API takes the subtree)
    for (const s of subjects.value) if (s.parentId === id) set.delete(s.id)
  } else {
    set.delete(id)
  }
  picked.value = subjects.value.filter(s => set.has(s.id)).map(s => s.id)
}

const coverage = computed(() => (mode.value === 'all' || !subjects.value.length ? [rootId.value].filter(Boolean) : picked.value))

function validate() {
  errors.title = title.value.trim() ? undefined : 'Dê um nome à prova.'
  errors.date = !date.value ? 'Escolha a data.' : date.value < minDate.value ? 'A data precisa ser de amanhã em diante.' : undefined
  errors.coverage = coverage.value.length ? undefined : (rootId.value ? 'Marque pelo menos uma matéria.' : 'Escolha o caderno da prova.')
  return !errors.title && !errors.date && !errors.coverage
}

async function submit() {
  if (saving.value || !validate()) return
  saving.value = true
  limitError.value = ''
  try {
    const body = { title: title.value.trim(), exam_date: date.value, topic_ids: coverage.value }
    let saved = props.exam ? await examStore.updateExam(props.exam.id, body) : await examStore.createExam(body)
    if (saved.reta_final_enabled !== retaFinal.value) saved = await examStore.toggleRetaFinal(saved.id)
    if (!props.exam) useAnalytics().track('exam_create', { origin: props.origin })
    toast.show(props.exam ? 'Prova salva.' : 'Prova criada. A revisão já prioriza os assuntos dela.', 'success')
    emit('saved', saved)
    emit('update:modelValue', false)
  } catch (e) {
    const data = (e as { data?: { code?: string; errors?: Record<string, string[]> } })?.data
    if (getErrorStatus(e) === 422 && data?.code === 'coverage_mixed_roots') errors.coverage = 'A prova cobre um caderno só: escolha matérias do mesmo caderno.'
    else if (getErrorStatus(e) === 422 && data?.errors?.limit?.[0]) limitError.value = 'No plano Grátis, até 2 provas futuras ao mesmo tempo.'
    else if (getErrorStatus(e) === 422 && data?.errors?.exam_date?.[0]) errors.date = 'A data precisa ser de amanhã em diante.'
    else reportApiError(e, { error: 'Não foi possível salvar a prova. Tente de novo.' })
  } finally {
    saving.value = false
  }
}
</script>
