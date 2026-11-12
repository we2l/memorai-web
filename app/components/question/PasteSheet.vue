<template>
  <UiSheet v-model="open" :title="title" :description="description" :side="wide ? 'right' : 'bottom'" size="lg">
    <div v-if="!topicOptions.length && topicStore.loading" class="flex flex-col gap-2" aria-busy="true">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>

    <div v-else-if="!topicOptions.length" class="flex flex-col items-start gap-3 py-2">
      <p class="text-body text-fg">Crie um caderno para guardar as questões que você errou.</p>
      <UiButton variant="primary" to="/cadernos?action=new-notebook" @click="open = false">Criar caderno</UiButton>
    </div>

    <!-- 1. Paste: the parser runs on paste (and on the button) -->
    <form v-else-if="step === 'paste'" id="question-paste-form" class="flex flex-col gap-3" @submit.prevent="separate">
      <UiSelect v-model="topicId" :options="topicOptions" label="Gravar em" data-testid="question-topic" />
      <UiTextarea
        ref="textRef"
        v-model="text"
        label="Questão"
        :rows="10"
        :maxlength="LIMITS.paste"
        hint="Enunciado, alternativas e gabarito; o comentário do professor também. Dá para colar várias, numeradas."
        placeholder="Cole aqui a questão que você errou no Qconcursos, no TEC ou numa prova antiga…"
        data-testid="question-text"
        @paste="onPaste"
        @keydown.ctrl.enter="separate"
        @keydown.meta.enter="separate"
      />
    </form>

    <!-- 2. Check: what the parser found, every field editable -->
    <div v-else class="flex flex-col gap-4">
      <p class="text-meta text-fg-muted" data-testid="question-found" aria-live="polite">
        {{ foundText }} Confira e corrija o que for preciso.
        <template v-if="truncated"> Só as {{ LIMITS.questions }} primeiras entram de uma vez.</template>
      </p>

      <QuestionEditor v-if="drafts.length === 1" v-model="drafts[0]!" :index="0" :errors="errors[0] ?? {}" />

      <ul v-else class="-mx-1 flex flex-col divide-y divide-hairline" aria-label="Questões encontradas">
        <li v-for="(d, i) in drafts" :key="i" class="py-1">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex min-h-touch min-w-0 flex-1 items-center gap-2 rounded-row px-1 text-left hover:bg-hover"
              :aria-expanded="expanded === i"
              :aria-controls="`question-panel-${i}`"
              :data-testid="`question-row-${i}`"
              @click="expanded = expanded === i ? -1 : i"
            >
              <ChevronRight class="size-4 shrink-0 text-fg-muted transition-transform duration-fast" :class="expanded === i && 'rotate-90'" aria-hidden="true" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-fg-strong">{{ questionSummary(d, i) }}</span>
                <span class="block truncate text-meta" :class="hasProblem(i) ? 'text-danger' : 'text-fg-muted'">{{ hasProblem(i) ? 'Falta corrigir' : d.stem }}</span>
              </span>
            </button>
            <UiIconButton :icon="Trash2" :label="`Tirar a questão ${i + 1}`" size="sm" @click="removeDraft(i)" />
          </div>
          <div v-if="expanded === i" :id="`question-panel-${i}`" class="px-1 pb-4 pt-2">
            <QuestionEditor v-model="drafts[i]!" :index="i" :errors="errors[i] ?? {}" />
          </div>
        </li>
      </ul>
    </div>

    <template v-if="topicOptions.length" #footer>
      <template v-if="step === 'paste'">
        <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
        <UiButton type="submit" form="question-paste-form" variant="primary" :disabled="!text.trim() || !topicId" data-testid="question-separate">Separar as partes</UiButton>
      </template>
      <template v-else>
        <UiButton variant="ghost" @click="step = 'paste'">Voltar</UiButton>
        <UiButton variant="primary" :loading="saving" :disabled="!drafts.length" data-testid="question-create" @click="create">
          {{ drafts.length === 1 ? 'Criar card' : `Criar ${drafts.length} cards` }}
        </UiButton>
      </template>
    </template>
  </UiSheet>
</template>

<script setup lang="ts">
// "Questão que errei" (prd-questao-errada RF-F2): paste a question from Qconcursos, TEC or an old exam, check
// what the parser separated (no AI) and create one review card per question in the place chosen. Free in
// every plan. The text is only what the person pasted (RN-5); the API escapes it into the card (RN-3).
import { ChevronRight, Trash2 } from 'lucide-vue-next'
import QuestionEditor from '~/components/question/QuestionEditor.vue'
import { parseQuestions, questionSummary } from '~/utils/questionParser'
import { QUESTION_LIMITS as LIMITS, draftErrors, draftPayload, splitQuestionErrors, toDraft, type QuestionDraft } from '~/utils/questionDraft'
import { fieldErrors } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'

const { open, topicId: presetTopic, created } = usePasteQuestion()
const topicStore = useTopicStore()
const route = useRoute()
const { $api } = useNuxtApp()
const toast = useToast()
const { track } = useAnalytics()

const step = ref<'paste' | 'review'>('paste')
const text = ref('')
const topicId = ref('')
const drafts = ref<QuestionDraft[]>([])
const parsedSnapshot = ref('')
const errors = ref<Record<string, string>[]>([])
const expanded = ref(0)
const truncated = ref(false)
const saving = ref(false)
const textRef = ref<{ focus: () => void } | null>(null)

const wide = ref(false)
onMounted(() => { wide.value = window.matchMedia('(min-width: 768px)').matches })

const topicOptions = computed(() => topicTreeOptions(topicStore.tree))
const topicName = computed(() => topicStore.findById(topicId.value)?.name ?? '')
const title = computed(() => (step.value === 'paste' ? 'Questão que errei' : 'Confira antes de criar'))
const description = computed(() => (topicName.value ? `Vira card em ${topicName.value}` : undefined))
const foundText = computed(() => (drafts.value.length === 1 ? 'Achamos 1 questão.' : `Achamos ${drafts.value.length} questões.`))

function pickTopic() {
  const known = (id: string | null) => (id && topicStore.findById(id) ? id : null)
  topicId.value = known(presetTopic.value) ?? known(scopeTopicOfRoute(route)) ?? known(lastAddTopic()) ?? topicStore.tree[0]?.id ?? ''
}

/** After a save: the next opening starts empty. Closing without saving keeps the paste (nothing is lost). */
function reset() {
  step.value = 'paste'
  text.value = ''
  drafts.value = []
  errors.value = []
}

/** On submit, the focus goes to the first field with an error (the question that has it is already open). */
function focusFirstError() {
  nextTick(() => requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"], [role="dialog"] [data-testid="question-answer"] input')?.focus?.()
  }))
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  if (!topicStore.tree.length && !topicStore.loading) await topicStore.fetchTree()
  pickTopic()
  nextTick(() => requestAnimationFrame(() => textRef.value?.focus()))
}, { immediate: true })
watch(() => topicStore.tree, () => { if (open.value && !topicId.value) pickTopic() })

/** Pasting is the usual way in: separate right away (the textarea already has the text on the next tick). */
function onPaste() {
  setTimeout(() => { if (text.value.trim()) separate() }, 0)
}

function separate() {
  if (!text.value.trim() || !topicId.value) return
  const result = parseQuestions(text.value)
  if (!result.questions.length) return
  drafts.value = result.questions.map(toDraft)
  parsedSnapshot.value = JSON.stringify(drafts.value)
  truncated.value = result.truncated
  errors.value = []
  // The first question the parser could not finish opens by itself
  const firstProblem = drafts.value.findIndex(d => Object.keys(draftErrors(d)).length > 0)
  expanded.value = firstProblem >= 0 ? firstProblem : 0
  step.value = 'review'
}

function hasProblem(i: number) {
  return Object.keys(errors.value[i] ?? {}).length > 0
}

function removeDraft(i: number) {
  drafts.value.splice(i, 1)
  errors.value.splice(i, 1)
  if (expanded.value >= drafts.value.length) expanded.value = drafts.value.length - 1
  if (!drafts.value.length) step.value = 'paste'
}

async function create() {
  if (saving.value || !drafts.value.length) return
  const local = drafts.value.map(draftErrors)
  const firstLocal = local.findIndex(e => Object.keys(e).length > 0)
  if (firstLocal >= 0) {
    errors.value = local
    expanded.value = firstLocal
    focusFirstError()
    return
  }

  saving.value = true
  const target = topicId.value
  try {
    const res = await $api<{ data: { card_ids: string[], session_count: number, topic: { id: string, name: string } } }>('/pasted-questions', {
      method: 'POST',
      body: { topic_id: target, questions: drafts.value.map(draftPayload) },
    })
    const count = res.data.card_ids.length
    track('question_pasted', { count, edited: JSON.stringify(drafts.value) !== parsedSnapshot.value, with_reason: drafts.value.some(d => d.error_reason) })
    rememberAddTopic(target)
    open.value = false
    reset()
    created.value++
    const where = res.data.topic.name || topicName.value || 'seu caderno'
    toast.show(count === 1 ? `Card criado em ${where}.` : `${count} cards criados em ${where}.`, 'success', {
      action: { label: 'Revisar agora', onClick: () => { void navigateTo(reviewPath({ type: 'cards', ids: res.data.card_ids })) } },
    })
    void topicStore.fetchTree()
    // A hub on screen (this scope or one above it): its numbers and the "Questões coladas" line come again
    const scope = useScopeStore()
    if (scope.topicId && route.path === cadernoPath(scope.topicId)) void scope.refresh()
  } catch (err) {
    const byField = getErrorStatus(err) === 422 ? fieldErrors(err) : {}
    if (Object.keys(byField).length) {
      if (byField.topic_id) toast.show(byField.topic_id, 'error')
      errors.value = splitQuestionErrors(byField, drafts.value.length)
      const first = errors.value.findIndex(e => Object.keys(e).length > 0)
      if (first >= 0) expanded.value = first
      focusFirstError()
    } else {
      // destination_in_trash and the rest: the API message, else a generic one
      reportApiError(err, { error: 'Não foi possível criar os cards. Tente de novo.' })
    }
  } finally {
    saving.value = false
  }
}
</script>
