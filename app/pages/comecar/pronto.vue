<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-6">
    <!-- Carrying the visitor's lote into the account -->
    <div v-if="state === 'saving'" class="flex flex-col gap-4" aria-busy="true">
      <p role="status" class="text-body text-fg-muted">Salvando seu progresso…</p>
      <UiSkeleton variant="block" size="lg" />
    </div>

    <div v-else-if="state === 'failed'" class="flex flex-col items-start gap-4" data-testid="saved-error">
      <h1 class="text-page-title-sm text-fg-strong">Seu lote ainda não foi salvo</h1>
      <p role="alert" class="text-body text-fg">{{ failMessage }}</p>
      <div class="flex flex-wrap gap-2">
        <UiButton variant="primary" @click="save">Tentar de novo</UiButton>
        <UiButton variant="ghost" to="/hoje">Ir para o Hoje</UiButton>
      </div>
    </div>

    <template v-else-if="state === 'ready'">
      <template v-if="step !== 'processing'">
        <div class="flex items-center gap-4" data-testid="saved">
          <UiBaigiMascot :size="64" :state="saved ? 'celebrating' : 'idle'" visible />
          <div class="min-w-0">
            <h1 ref="title" class="text-page-title-sm text-fg-strong outline-none" tabindex="-1">{{ saved ? 'Seu progresso está salvo' : 'Comece pelo seu material' }}</h1>
            <p v-if="saved" class="mt-1 text-body text-fg-muted" data-testid="saved-line">
              {{ saved.cards }} cards de {{ saved.topicName }}{{ saved.reviews ? `, com as ${saved.reviews} avaliações do lote` : '' }}.
            </p>
          </div>
        </div>

        <OnboardingTomorrow :forecast="tomorrow" :loading="tomorrowLoading" :failed="tomorrowFailed" />

        <OnboardingContentStep
          v-if="step === 'content'"
          v-model:path="path"
          v-model:text="text"
          v-model:name="notebookName"
          v-model:name-touched="nameTouched"
          :verified="auth.isVerified"
          :busy="busy"
          :error="error"
          :name-error="nameError"
          @submit="start"
          @file="startPdf"
          @back="step = 'choice'"
        />

        <div v-else class="flex flex-col gap-2 sm:flex-row" data-testid="saved-next">
          <UiButton variant="primary" data-testid="saved-material" @click="openContent">Agora com o seu material</UiButton>
          <UiButton variant="ghost" to="/hoje" data-testid="saved-home">Ver o Hoje</UiButton>
        </div>
      </template>

      <!-- Text and PDF on their way: the cards take shape, with the state and the estimate -->
      <div v-else class="flex flex-col gap-4" data-testid="processing-step">
        <h1 class="text-page-title-sm text-fg-strong outline-none" tabindex="-1">{{ processingTitle }}</h1>
        <p role="status" class="text-body text-fg-muted" data-testid="processing-state">{{ processingState }}</p>
        <div v-if="retryFinish">
          <UiButton variant="primary" data-testid="processing-retry" @click="retryFinish">Tentar de novo</UiButton>
        </div>
        <UiProgressBar v-else-if="path === 'pdf'" :value="docUpload.uploadProgress.value" label="Enviando o PDF" show-value size="md" />
        <template v-else>
          <UiSkeleton v-for="i in 3" :key="i" variant="block" />
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
interface GuestImport { data: { card_ids: string[], reviews_applied: number, created: boolean } }
/** Module scope: one POST per lote even when the page mounts twice on the way in (a 2nd would apply nothing). */
let inflight: Promise<GuestImport> | null = null
let lastSaved: { cards: number, reviews: number, topicName: string } | null = null
</script>

<script setup lang="ts">
// After the sign-up (prd-onboarding-v4 RF-F5): the visitor's lote goes into the account (POST /onboarding/guest),
// then tomorrow and the 19h reminder, and two ways on: "Agora com o seu material" (the v3 content step without the
// sample: PDF, text, pasted question, Anki) or "Ver o Hoje". The onboarding is already done by the import, so
// nothing here keeps the person in the flow.
import type { ContentPath } from '~/components/onboarding/ContentStep.vue'
import type { Flashcard, TomorrowForecast } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { AiJobError } from '~/composables/useAiJob'
import { areaName, clearGuestProgress, loadGuestProgress } from '~/utils/guestProgress'
import { markFirstMaterialPending } from '~/utils/firstMaterial'
import { reviewPath } from '~/utils/reviewScope'

definePageMeta({ layout: 'auth', wide: true })
useHead({ title: 'Progresso salvo · Baigi' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { track } = useAnalytics()
const aiJob = useAiJob()
const docUpload = useDocumentUpload()
const pasteQuestion = usePasteQuestion()

const state = ref<'saving' | 'failed' | 'ready'>('saving')
const failMessage = ref('')
const saved = ref<{ cards: number, reviews: number, topicName: string } | null>(null)
const title = ref<HTMLElement | null>(null)
const tomorrow = ref<TomorrowForecast | null>(null)
const tomorrowLoading = ref(true)
const tomorrowFailed = ref(false)

type Step = 'choice' | 'content' | 'processing'
const step = ref<Step>('choice')
const path = ref<ContentPath>('pdf')
const text = ref('')
const notebookName = ref('')
const nameTouched = ref(false)
const nameError = ref('')
const error = ref('')
const busy = ref(false)
const processingTitle = ref('')
const processingState = ref('')
const retryFinish = ref<(() => void) | null>(null)

watch(text, (t) => { if (!nameTouched.value) notebookName.value = smartTitle(t, 40) })

async function save() {
  const lote = loadGuestProgress()
  if (lastSaved) {
    saved.value = lastSaved
    return ready()
  }
  if (!lote || !lote.reviews.length) {
    // Signed in without a lote: an account that never did the onboarding starts it; any other sees the ways on
    if (!auth.user?.onboarding_completed) return navigateTo('/comecar', { replace: true })
    return ready()
  }
  state.value = 'saving'
  try {
    // One request per lote, even if the page mounts twice on the way in (a 2nd POST would answer "nothing applied")
    inflight ??= $api<GuestImport>('/onboarding/guest', {
      method: 'POST',
      body: { area: lote.area, version: lote.version, reviews: lote.reviews },
    })
    const res = await inflight
    clearGuestProgress()
    if (auth.user) {
      auth.user.onboarding_completed = true
      markFirstMaterialPending(auth.user.id)
    }
    const first = !lastSaved
    saved.value = lastSaved ??= { cards: res.data.card_ids.length, reviews: res.data.reviews_applied, topicName: areaName(lote.area) }
    if (first) track('signup_from_guest', { area: lote.area, reviews_applied: res.data.reviews_applied, created: res.data.created })
    ready()
  } catch (e) {
    inflight = null
    reportApiError(e, { silent: true })
    failMessage.value = getErrorStatus(e) === 429
      ? 'Muitas tentativas. Tente de novo em alguns minutos: o lote continua guardado neste aparelho.'
      : 'Não conseguimos falar com o servidor. O lote continua guardado neste aparelho.'
    state.value = 'failed'
  }
}

function ready() {
  state.value = 'ready'
  void nextTick(() => title.value?.focus())
  void loadTomorrow()
}

async function loadTomorrow() {
  tomorrowLoading.value = true
  try {
    tomorrow.value = (await $api<{ data: TomorrowForecast }>('/review/tomorrow')).data
  } catch (e) {
    reportApiError(e, { silent: true })
    tomorrowFailed.value = true
  } finally {
    tomorrowLoading.value = false
  }
}

function openContent() {
  step.value = 'content'
  track('onboarding_step', { step: 2, mode: auth.user?.default_learning_mode ?? null })
  void nextTick(() => document.querySelector<HTMLElement>('[data-testid="content-title"]')?.focus())
}

function goProcessing() {
  step.value = 'processing'
  void nextTick(() => document.querySelector<HTMLElement>('main h1')?.focus())
}

async function start() {
  if (busy.value) return
  error.value = ''
  nameError.value = ''
  track('onboarding_path', { path: path.value })
  if (path.value === 'text') await startText()
  else if (path.value === 'anki') await navigateTo('/importar')
  else if (path.value === 'question') {
    await navigateTo('/hoje')
    pasteQuestion.show('add')
  }
}

const ZERO_CARDS = 'Não conseguimos criar cards com esse texto. Tente colar um trecho maior (cerca de 200 palavras).'

type Cards = Pick<Flashcard, 'front' | 'back'>[]
interface TextAttempt { topicId: string, noteId: string, jobId?: string, cards?: Cards }

async function startText() {
  const name = notebookName.value.trim()
  if (name.length < 2) {
    nameError.value = 'Dê um nome ao caderno (pelo menos 2 caracteres).'
    return
  }
  processingTitle.value = 'Criando seus cards'
  processingState.value = 'Lendo o texto · ~20 s'
  retryFinish.value = null
  goProcessing()
  const writing = setTimeout(() => { processingState.value = 'Escrevendo os cards · ~15 s' }, 5000)
  let topicId = ''
  try {
    // A failed attempt deletes its caderno, so each attempt creates one
    topicId = (await $api<{ data: { id: string } }>('/topics', { method: 'POST', body: { name } })).data.id
    const noteId = (await $api<{ data: { id: string } }>(`/topics/${topicId}/notes`, {
      method: 'POST',
      body: { title: 'Material inicial', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: text.value }] }] } },
    })).data.id
    await continueText({ topicId, noteId })
  } catch (e: any) {
    failText(topicId, extractApiMessage(e, e?.data?.message || 'Não conseguimos gerar os cards. Tente de novo.'))
  } finally {
    clearTimeout(writing)
  }
}

/** What was paid for is kept: a slow job is followed again and unsaved cards are sent again, never generated twice. */
async function continueText(a: TextAttempt) {
  retryFinish.value = null
  const again = (message: string) => {
    processingState.value = message
    retryFinish.value = () => { void continueText(a) }
  }
  if (!a.cards) {
    try {
      const result = a.jobId
        ? await aiJob.wait<{ cards: Cards }>(a.jobId)
        : await aiJob.run<{ cards: Cards }>('/ai/generate-cards', { source: 'notes', topic_id: a.topicId, note_id: a.noteId })
      a.cards = result?.cards ?? []
    } catch (e: any) {
      if (e instanceof AiJobError && e.jobId) {
        a.jobId = e.jobId
        again('Está demorando mais que o normal. Os cards ainda podem chegar.')
        return
      }
      failText(a.topicId, extractApiMessage(e, e?.data?.message || 'Não conseguimos gerar os cards. Tente de novo.'))
      return
    }
    if (!a.cards.length) {
      failText(a.topicId, ZERO_CARDS)
      return
    }
  }
  try {
    await $api('/ai/accept-cards', { method: 'POST', body: { topic_id: a.topicId, note_id: a.noteId, cards: a.cards } })
  } catch (e) {
    reportApiError(e, { silent: true })
    again('Os cards estão prontos, mas não conseguimos salvá-los.')
    return
  }
  track('onboarding_completed', { path: 'text', learning_mode: auth.user?.default_learning_mode ?? null })
  await navigateTo(`${reviewPath({ type: 'note', id: a.noteId })}`, { replace: true })
}

function failText(topicId: string, message: string) {
  error.value = message
  if (topicId) void discard(topicId)
  step.value = 'content'
}

/** A failed attempt leaves nothing behind, in the trash neither (the text stays in the form). */
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
  const invalid = await docUpload.validate(file)
  if (invalid) {
    error.value = invalid
    return
  }
  processingTitle.value = 'Enviando seu PDF'
  processingState.value = 'Depois do envio, ele vira nota e cards em segundo plano.'
  goProcessing()
  // No topic first: POST /documents without topic_id creates the caderno
  const result = await docUpload.upload(file, { topicId: null, autoCards: true, learningMode: auth.user?.default_learning_mode ?? null, source: 'onboarding' })
  if (!result) {
    step.value = 'content'
    return
  }
  track('onboarding_completed', { path: 'pdf', learning_mode: auth.user?.default_learning_mode ?? null })
  await navigateTo(cadernoPath(result.topic_id), { replace: true })
}

onMounted(() => { void save() })
</script>
