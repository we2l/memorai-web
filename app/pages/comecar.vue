<template>
  <div class="flex flex-col gap-6">
    <OnboardingSteps :step="step === 'mode' ? 1 : 2" class="max-w-md" />

    <OnboardingModeStep
      v-if="step === 'mode'"
      v-model:mode="mode"
      v-model:exam-date="examDate"
      :saving="savingMode"
      @next="saveMode"
    />

    <OnboardingContentStep
      v-else-if="step === 'content'"
      v-model:path="path"
      v-model:text="text"
      v-model:name="notebookName"
      v-model:name-touched="nameTouched"
      :mode="mode"
      :verified="auth.isVerified"
      :busy="busy"
      :error="error"
      :name-error="nameError"
      @submit="start"
      @file="startPdf"
      @back="goTo('mode')"
      @skip="skip"
    />

    <!-- Text and PDF on their way (RF-F7): the cards take shape, with the state and the estimate -->
    <div v-else class="flex max-w-2xl flex-col gap-4" data-testid="processing-step">
      <h1 class="text-page-title-sm text-fg-strong outline-none sm:text-page-title" tabindex="-1">{{ processingTitle }}</h1>
      <p role="status" class="text-body text-fg-muted" data-testid="processing-state">{{ processingState }}</p>
      <UiProgressBar v-if="path === 'pdf'" :value="docUpload.uploadProgress.value" label="Enviando o PDF" show-value size="md" />
      <template v-else>
        <UiSkeleton v-for="i in 3" :key="i" variant="block" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Onboarding v4 (prd-4g-conta-onboarding-v3 RF-F5..F10): mode → content → first review. The sample creates a
// caderno without AI, without quota and without confirming the e-mail, and goes straight to the first batch
// (step 3, /revisar?onboarding=1). Text and PDF use AI; a failed attempt leaves no empty caderno behind. The
// onboarding counts as done when the cards exist (RF-B4), so nobody is kept here in the middle of the review.
import type { ContentPath } from '~/components/onboarding/ContentStep.vue'
import type { Flashcard } from '~/types'
import { reviewPath } from '~/utils/reviewScope'
import { sampleMode } from '~/utils/onboardingSamples'
import { getErrorStatus } from '~/utils/apiErrors'

definePageMeta({ layout: 'auth', wide: true })
useHead({ title: 'Começar · Baigi' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { track } = useAnalytics()
const { run, pending: savingMode } = useApiAction()
const aiJob = useAiJob()
const docUpload = useDocumentUpload()

type Step = 'mode' | 'content' | 'processing'
const step = ref<Step>('mode')
const mode = ref('')
const examDate = ref('')
const path = ref<ContentPath>('sample')
const text = ref('')
const notebookName = ref('')
const nameTouched = ref(false)
const nameError = ref('')
const error = ref('')
const busy = ref(false)
const processingTitle = ref('')
const processingState = ref('')

// The name follows the text's first line until the person edits it
watch(text, (t) => { if (!nameTouched.value) notebookName.value = smartTitle(t, 40) })

function goTo(next: Step) {
  step.value = next
  // Screen reader and keyboard start at the title of the new step
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus())
}
watch(step, (s) => {
  if (s !== 'processing') track('onboarding_step', { step: s === 'mode' ? 1 : 2, mode: mode.value || null })
}, { immediate: true })

async function saveMode() {
  // Never blocks the next step: the error is shown and the person moves on
  const ok = await run(() => $api('/onboarding/learning-mode', { method: 'POST', body: { learning_mode: mode.value } }), {
    error: 'Não conseguimos salvar seu modo de estudo. Você pode mudar depois em Configurações.',
  })
  if (ok !== undefined && auth.user) auth.user.default_learning_mode = mode.value
  goTo('content')
}

function markDone(pathName: ContentPath | 'skip') {
  if (auth.user) auth.user.onboarding_completed = true
  track('onboarding_completed', { path: pathName, learning_mode: mode.value || null })
}

/** The exam of the first step, only once the cards exist. Optional: never blocks the onboarding. */
async function createExam(topicId: string) {
  if (!examDate.value || !['exam', 'academic'].includes(mode.value)) return
  try {
    await $api('/exams', { method: 'POST', body: { title: 'Minha prova', exam_date: examDate.value, topic_ids: [topicId] } })
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

function firstReview(noteId: string) {
  return `${reviewPath({ type: 'note', id: noteId })}&onboarding=1`
}

async function start() {
  if (busy.value) return
  error.value = ''
  nameError.value = ''
  track('onboarding_path', { path: path.value })
  if (path.value === 'sample') await startSample()
  else if (path.value === 'text') await startText()
  else if (path.value === 'anki') await startAnki()
}

async function startSample() {
  busy.value = true
  try {
    const res = await $api<{ data: { topic_id: string; note_id: string } }>('/onboarding/sample', { method: 'POST', body: { mode: sampleMode(mode.value) } })
    track('onboarding_sample_created', { mode: sampleMode(mode.value) })
    void createExam(res.data.topic_id)
    markDone('sample') // the API already concluded the onboarding with the cards (RF-B4)
    await navigateTo(firstReview(res.data.note_id))
  } catch (e) {
    error.value = getErrorStatus(e) === 429
      ? 'Muitas tentativas. Tente de novo em alguns minutos.'
      : 'Não conseguimos criar o exemplo. Tente de novo.'
    reportApiError(e, { silent: true })
  } finally {
    busy.value = false
  }
}

const ZERO_CARDS = 'Não conseguimos criar cards com esse texto. Tente colar um trecho maior (cerca de 200 palavras).'

async function startText() {
  const name = notebookName.value.trim()
  if (name.length < 2) {
    nameError.value = 'Dê um nome ao caderno (pelo menos 2 caracteres).'
    return
  }
  processingTitle.value = 'Criando seus cards'
  processingState.value = 'Lendo o texto · ~20 s'
  goTo('processing')
  const generating = setTimeout(() => { processingState.value = 'Escrevendo os cards · ~15 s' }, 5000)
  let topicId = ''
  try {
    // A failed attempt deletes its caderno, so each attempt creates one
    topicId = (await $api<{ data: { id: string } }>('/topics', { method: 'POST', body: { name } })).data.id
    const noteId = (await $api<{ data: { id: string } }>(`/topics/${topicId}/notes`, {
      method: 'POST',
      body: { title: 'Material inicial', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: text.value }] }] } },
    })).data.id

    const result = await aiJob.run<{ cards: Pick<Flashcard, 'front' | 'back'>[] }>('/ai/generate-cards', { source: 'notes', topic_id: topicId, note_id: noteId })
    const cards = result?.cards ?? []
    if (!cards.length) throw new Error(ZERO_CARDS)

    await $api('/ai/accept-cards', { method: 'POST', body: { topic_id: topicId, note_id: noteId, cards } })
    void createExam(topicId)
    await $api('/onboarding/complete', { method: 'POST' })
    markDone('text')
    await navigateTo(firstReview(noteId))
  } catch (e: any) {
    error.value = e?.message === ZERO_CARDS ? ZERO_CARDS : extractApiMessage(e, e?.data?.message || 'Não conseguimos gerar os cards. Tente de novo.')
    if (topicId) void discard(topicId)
    goTo('content')
  } finally {
    clearTimeout(generating)
  }
}

/** A failed attempt leaves nothing behind, in the trash neither: nothing of the person's is lost (the text stays in the form). */
async function discard(topicId: string) {
  try {
    const res = await $api<{ data?: { trash_batch_id?: string } }>(`/topics/${topicId}`, { method: 'DELETE' })
    const batch = res?.data?.trash_batch_id
    if (batch) await $api(`/trash/${batch}`, { method: 'DELETE' })
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

async function startPdf(file: File) {
  error.value = ''
  track('onboarding_path', { path: 'pdf' })
  // Size and type against the plan before any request
  const invalid = await docUpload.validate(file)
  if (invalid) {
    error.value = invalid
    return
  }
  processingTitle.value = 'Enviando seu PDF'
  processingState.value = 'Depois do envio, ele vira nota e cards em segundo plano.'
  goTo('processing')
  // No topic first: POST /documents without topic_id creates the caderno
  const result = await docUpload.upload(file, { topicId: null, autoCards: true, learningMode: mode.value || null, source: 'onboarding' })
  if (!result) {
    goTo('content')
    return
  }
  void createExam(result.topic_id)
  await finish('pdf', cadernoPath(result.topic_id))
}

async function startAnki() {
  await finish('anki', '/importar')
}

function skip() {
  track('onboarding_path', { path: 'skip' })
  return finish('skip', '/hoje')
}

/** Paths whose cards come later: the onboarding ends here, and the checklist of Hoje keeps the first review. */
async function finish(name: ContentPath | 'skip', to: string) {
  busy.value = true
  try {
    await $api('/onboarding/complete', { method: 'POST' })
    markDone(name)
    await navigateTo(to)
  } catch (e) {
    error.value = 'Não conseguimos concluir seu cadastro. Tente de novo.'
    reportApiError(e, { silent: true })
    if (step.value === 'processing') goTo('content')
  } finally {
    busy.value = false
  }
}
</script>
