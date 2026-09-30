<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-md">

      <!-- Step 0: Learning Mode -->
      <div v-if="step === 0">
        <h1 class="text-display text-center mb-2">O que você mais estuda?</h1>
        <p class="text-base-muted text-small text-center mb-8">Isso ajuda a IA a gerar materiais no formato ideal pra você.</p>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="mode in learningModes"
            :key="mode.value"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center"
            :class="selectedMode === mode.value
              ? 'border-[var(--color-accent-primary)] bg-accent-primary-subtle'
              : 'border-base bg-[var(--bg-card)] hover:border-[var(--color-accent-primary)]/50'"
            @click="selectMode(mode.value)"
          >
            <span class="text-2xl">{{ mode.icon }}</span>
            <span class="text-small font-medium text-base-primary">{{ mode.label }}</span>
          </button>
        </div>

        <!-- Language sub-form (inline) -->
        <div v-if="selectedMode === 'language'" class="mt-4 p-4 rounded-xl bg-[var(--bg-card)] border border-base space-y-3">
          <div>
            <label class="text-small font-medium text-base-primary mb-1 block">Qual idioma?</label>
            <select v-model="targetLanguage" class="input-base w-full !text-small">
              <option value="">Selecione...</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
              <option value="fr">Francês</option>
              <option value="de">Alemão</option>
              <option value="it">Italiano</option>
              <option value="ja">Japonês</option>
              <option value="ko">Coreano</option>
              <option value="zh">Chinês</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div>
            <label class="text-small font-medium text-base-primary mb-1 block">Seu nível</label>
            <div class="flex gap-2">
              <button
                v-for="level in languageLevels"
                :key="level.value"
                class="flex-1 py-2 rounded-lg text-small font-medium transition-all border"
                :class="languageLevel === level.value
                  ? 'border-[var(--color-accent-primary)] bg-accent-primary-subtle text-accent-primary'
                  : 'border-base bg-[var(--bg-card)] text-base-secondary hover:border-[var(--color-accent-primary)]/50'"
                @click="languageLevel = level.value"
              >
                {{ level.label }}
              </button>
            </div>
          </div>
          <button
            class="btn-primary w-full !py-2.5 text-small font-semibold"
            :disabled="!targetLanguage || !languageLevel"
            @click="saveLearningMode"
          >
            Continuar →
          </button>
        </div>

        <!-- Exam date (optional, RF-F4.7) -->
        <div v-if="selectedMode === 'exam'" class="mt-4 p-4 rounded-xl bg-[var(--bg-card)] border border-base">
          <label for="exam-date" class="text-small font-medium text-base-primary mb-1 block">Tem data de prova? (opcional)</label>
          <input
            id="exam-date"
            v-model="examDate"
            type="date"
            class="input-base w-full !text-small"
            :min="tomorrow"
            aria-describedby="exam-date-help"
          />
          <p id="exam-date-help" class="text-micro text-base-muted mt-1">Usamos para priorizar a revisão perto da prova.</p>
        </div>

        <button
          v-if="selectedMode && selectedMode !== 'language'"
          class="btn-primary w-full mt-4 !py-3 text-base font-semibold"
          @click="saveLearningMode"
        >
          Continuar →
        </button>

        <button class="w-full text-center text-micro text-base-muted mt-4 hover:text-base-secondary" @click="skipLearningMode">
          Pular →
        </button>
      </div>

      <!-- Step 1: Input -->
      <div v-if="step === 1">
        <h1 class="text-display text-center mb-2">Pare de esquecer o que estuda</h1>
        <p class="text-base-muted text-small text-center mb-8">Cole seu material abaixo e a IA gera flashcards para você revisar.</p>

        <label for="notebook-name" class="text-small font-medium text-base-primary mb-1 block">Nome do caderno</label>
        <input
          id="notebook-name"
          v-model="notebookName"
          class="input-base w-full !text-small mb-3"
          placeholder="Ex: Direito Constitucional"
          maxlength="80"
          :aria-invalid="!!notebookNameError"
          :aria-describedby="notebookNameError ? 'notebook-name-error' : undefined"
          @input="notebookNameTouched = true"
          @keydown.stop
        />
        <p v-if="notebookNameError" id="notebook-name-error" class="text-[var(--badge-danger-text)] text-micro -mt-2 mb-3">{{ notebookNameError }}</p>

        <label for="material" class="sr-only">Material de estudo</label>
        <textarea
          id="material"
          v-model="textInput"
          class="textarea-base w-full"
          rows="6"
          placeholder="Cole aqui um resumo, anotação de aula, trecho de apostila..."
          autofocus
          maxlength="5000"
          :aria-describedby="error ? 'onboarding-error' : undefined"
          @keydown.stop
        />
        <div class="flex justify-between gap-2 mt-1">
          <p v-if="error" id="onboarding-error" role="alert" class="text-[var(--badge-danger-text)] text-micro">{{ error }}</p>
          <span v-else />
          <span class="text-micro text-base-muted shrink-0">{{ textInput.length }}/5000</span>
        </div>

        <button
          class="btn-primary w-full mt-4 !py-3 text-base font-semibold"
          :disabled="!textInput.trim() || generating"
          @click="generateFromText"
        >
          {{ generating ? 'Gerando cards...' : 'Transformar em estudo' }}
        </button>

        <!-- Secondary: topic-based generation -->
        <div class="flex items-center gap-3 mt-6">
          <div class="flex-1 h-px bg-[var(--border-base)]" />
          <span class="text-micro text-base-muted">ou</span>
          <div class="flex-1 h-px bg-[var(--border-base)]" />
        </div>

        <div class="mt-4">
          <p class="text-small text-base-muted mb-2">Não tem material agora? Digite o tema:</p>
          <div class="flex gap-2">
            <input
              v-model="topicInput"
              class="input-base flex-1 !text-small"
              placeholder="Ex: Biologia, Direito Penal, Inglês..."
              @keydown.enter.prevent="generateFromTopic"
              @keydown.stop
            />
            <button
              class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small shrink-0"
              :disabled="!topicInput.trim() || generating"
              @click="generateFromTopic"
            >
              Gerar →
            </button>
          </div>
        </div>

        <!-- Tertiary options -->
        <div class="flex gap-3 mt-4">
          <label class="btn-secondary flex-1 justify-center cursor-pointer !py-2.5 text-small">
            <input type="file" accept=".pdf,application/pdf" class="sr-only" @change="handlePdf" />
            📄 Subir PDF
          </label>
          <button type="button" class="btn-secondary flex-1 justify-center !py-2.5 text-small" :disabled="completing" @click="goToAnkiImport">
            📦 Importar Anki
          </button>
        </div>

        <button class="w-full text-center text-micro text-base-muted mt-4 hover:text-base-secondary" @click="skipToApp">
          Pular e explorar o app →
        </button>
      </div>

      <!-- Step 2: Processing -->
      <div v-else-if="step === 2" class="text-center">
        <div class="animate-spin w-10 h-10 border-3 border-accent-primary border-t-transparent rounded-full mx-auto mb-6" />
        <p class="text-title text-base-primary mb-2">{{ loadingMessage }}</p>
        <template v-if="uploadingPdf">
          <div
            class="w-full h-2 bg-[var(--border-base)] rounded-full overflow-hidden mt-4"
            role="progressbar"
            aria-label="Enviando PDF"
            :aria-valuenow="docUpload.uploadProgress.value"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="h-full bg-[var(--color-accent-primary)] transition-all" :style="{ width: docUpload.uploadProgress.value + '%' }" />
          </div>
          <p class="text-micro text-base-muted mt-2">{{ docUpload.uploadProgress.value }}%</p>
        </template>
        <p v-else class="text-small text-base-muted">Isso leva poucos segundos...</p>
      </div>

      <!-- Step 3: Success → Review -->
      <div v-else-if="step === 3" class="text-center">
        <div class="w-14 h-14 rounded-2xl bg-accent-primary-subtle flex items-center justify-center mx-auto mb-4"><Sparkles :size="28" class="text-[var(--badge-primary-text)]" /></div>
        <h1 class="text-display mb-2">{{ generatedCount }} cards prontos!</h1>
        <p class="text-small text-base-muted mb-8">Vamos revisar os primeiros para você ver como funciona.</p>

        <button class="btn-primary w-full !py-3 text-base font-semibold glow-primary" @click="goToReview">
          Começar revisão →
        </button>
        <button class="btn-secondary w-full mt-3 justify-center" @click="goToDashboard">
          Explorar o app primeiro
        </button>

        <OnboardingReminderRow v-model:enabled="reminderEnabled" v-model:hour="reminderHour" class="mt-6" />
      </div>

      <!-- Step PDF processing (background) -->
      <div v-else-if="step === 4" class="text-center">
        <p class="text-4xl mb-4">📄</p>
        <h1 class="text-display mb-2">PDF enviado!</h1>
        <p class="text-small text-base-muted mb-8">
          Estamos lendo seu PDF. Em alguns minutos ele vira um <strong>resumo</strong> e cards prontos para revisar. Avisamos aqui e em Cadernos.
        </p>

        <button class="btn-primary w-full !py-3 text-base font-semibold" :disabled="completing" @click="goToNotebook">
          Ver meu caderno →
        </button>
        <button class="btn-secondary w-full mt-3 justify-center" :disabled="completing" @click="goToDashboard">
          Explorar o app
        </button>

        <OnboardingReminderRow v-model:enabled="reminderEnabled" v-model:hour="reminderHour" class="mt-6" />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import type { OnboardingPath } from '~/types/analytics'
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const { track } = useAnalytics()

const step = ref(0)

// Onboarding funnel (prd-analytics-posthog §4.3): real step names, see docs/produto/eventos-analytics.md
const STEP_NAMES = ['learning_mode', 'choose_path', 'processing', 'cards_ready', 'pdf_sent'] as const
watch(step, (s) => {
  track('onboarding_step_viewed', { step: s as 0 | 1 | 2 | 3 | 4, step_name: STEP_NAMES[s] ?? 'choose_path' })
}, { immediate: true })
const textInput = ref('')
const topicInput = ref('')
const generating = ref(false)
const generatedCount = ref(0)
const loadingMessage = ref('Analisando material...')
const createdTopicId = ref('')
const error = ref('')
const completing = ref(false)
const uploadingPdf = ref(false)

// Notebook name: follows the text's first line until the user edits it (RF-F4.3)
const notebookName = ref('')
const notebookNameTouched = ref(false)
const notebookNameError = ref('')
watch(() => textInput.value, (text) => {
  if (!notebookNameTouched.value) notebookName.value = smartTitle(text, 40)
})

// Optional exam date (RF-F4.7)
const examDate = ref('')
const tomorrow = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const ZERO_CARDS_MESSAGE = 'Não conseguimos criar cards com esse texto. Tente colar um trecho maior (mín. ~200 palavras) ou digite um tema.'

// Learning mode selection (step 0)
const selectedMode = ref('')
const targetLanguage = ref('')
const languageLevel = ref('')

const learningModes = [
  { value: 'exam', icon: '📚', label: 'Concurso / Vestibular' },
  { value: 'academic', icon: '🎓', label: 'Faculdade / Escola' },
  { value: 'language', icon: '🌍', label: 'Idiomas' },
  { value: 'technical', icon: '💻', label: 'Programação / TI' },
  { value: 'professional', icon: '📋', label: 'Certificações' },
  { value: 'general', icon: '✨', label: 'Uso geral' },
]

const languageLevels = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
]

function selectMode(mode: string) {
  selectedMode.value = mode
  if (mode !== 'language') {
    targetLanguage.value = ''
    languageLevel.value = ''
  }
}

const { run: runAction } = useApiAction()
const aiJob = useAiJob()
const docUpload = useDocumentUpload()

async function saveLearningMode() {
  const body: Record<string, string> = { learning_mode: selectedMode.value }
  if (selectedMode.value === 'language') {
    body.target_language = targetLanguage.value
    body.language_level = languageLevel.value
  }
  // Never blocks the next step: the error is shown and the user moves on
  const ok = await runAction(() => $api('/onboarding/learning-mode', { method: 'POST', body }), {
    error: 'Não conseguimos salvar seu modo de estudo. Você pode mudar depois em Configurações.',
  })
  if (ok !== undefined && auth.user) auth.user.default_learning_mode = selectedMode.value
  step.value = 1
}

function skipLearningMode() {
  step.value = 1
}

async function generateFromText() {
  if (!textInput.value.trim()) return
  error.value = ''
  notebookNameError.value = ''
  const name = notebookName.value.trim()
  if (name.length < 2) {
    notebookNameError.value = 'Dê um nome ao caderno (mín. 2 caracteres).'
    return
  }
  generating.value = true
  step.value = 2

  const messages = [
    'Analisando material...',
    'Identificando conceitos...',
    'Gerando flashcards...',
  ]
  let msgIdx = 0
  const interval = setInterval(() => {
    msgIdx++
    if (msgIdx < messages.length) loadingMessage.value = messages[msgIdx]
  }, 1500)

  try {
    // Reuse the caderno if a previous attempt already created it (0 cards keeps it)
    if (!createdTopicId.value) {
      const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
      createdTopicId.value = topicRes.data.id
      void createExamIfAny(createdTopicId.value)
    }

    // Save text as a note in the topic
    await $api<any>(`/topics/${createdTopicId.value}/notes`, {
      method: 'POST',
      body: { title: 'Material inicial', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: textInput.value }] }] } },
    })

    // Generate cards (202 + job polling)
    const result = await aiJob.run<{ cards: any[] }>('/ai/generate-cards', {
      source: 'notes',
      prompt: textInput.value,
      topic_id: createdTopicId.value,
      count: 10,
    })
    await acceptOrFail(result?.cards ?? [])
  } catch (e: any) {
    error.value = extractApiMessage(e, e?.data?.message || 'Erro ao gerar cards. Tente novamente.')
    step.value = 1
  } finally {
    generating.value = false
    clearInterval(interval)
  }
}

/** 0 cards never reaches step 3 (RF-F4.2): back to step 1 with guidance, onboarding not completed. */
async function acceptOrFail(cards: any[]) {
  if (!cards.length) {
    error.value = ZERO_CARDS_MESSAGE
    step.value = 1
    return
  }
  await $api('/ai/accept-cards', {
    method: 'POST',
    body: { cards: cards.map((c: any) => ({ ...c, topic_id: createdTopicId.value })) },
  })
  generatedCount.value = cards.length
  step.value = 3
}

async function createExamIfAny(topicId: string) {
  if (selectedMode.value !== 'exam' || !examDate.value) return
  try {
    await $api('/exams', { method: 'POST', body: { title: 'Minha prova', exam_date: examDate.value, topic_ids: [topicId] } })
  } catch (e) {
    // Optional: never blocks the onboarding
    reportApiError(e, { silent: true })
  }
}

async function generateFromTopic() {
  if (!topicInput.value.trim()) return
  error.value = ''
  generating.value = true
  step.value = 2

  const messages = ['Pensando no tema...', 'Gerando conceitos...', 'Criando flashcards...']
  let msgIdx = 0
  const interval = setInterval(() => {
    msgIdx++
    if (msgIdx < messages.length) loadingMessage.value = messages[msgIdx]
  }, 1500)

  try {
    const name = topicInput.value.trim()
    if (!createdTopicId.value) {
      const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
      createdTopicId.value = topicRes.data.id
      void createExamIfAny(createdTopicId.value)
    }

    const result = await aiJob.run<{ cards: any[] }>('/ai/generate-cards', {
      source: 'free',
      prompt: name,
      topic_id: createdTopicId.value,
      count: 10,
    })
    await acceptOrFail(result?.cards ?? [])
  } catch (e: any) {
    error.value = extractApiMessage(e, e?.data?.message || 'Erro ao gerar cards. Tente novamente.')
    step.value = 1
  } finally {
    generating.value = false
    clearInterval(interval)
  }
}

async function handlePdf(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''

  // Size/type against the plan before any request (RN-UX-06)
  const invalid = await docUpload.validate(file)
  if (invalid) {
    error.value = invalid
    return
  }

  step.value = 2
  loadingMessage.value = 'Enviando PDF...'
  uploadingPdf.value = true
  try {
    // No topic first: POST /documents without topic_id creates the caderno
    const result = await docUpload.upload(file, {
      topicId: createdTopicId.value || null,
      autoCards: true,
      learningMode: selectedMode.value || null,
      source: 'onboarding',
    })
    if (!result) {
      step.value = 1
      return
    }
    createdTopicId.value = result.topic_id
    void createExamIfAny(result.topic_id)
    step.value = 4
  } finally {
    uploadingPdf.value = false
  }
}

// Daily reminder, on by default (prd-retencao-lembretes RF-F02): saved only if changed
const reminderEnabled = ref(true)
const reminderHour = ref(DEFAULT_REMINDER_HOUR)
const reminderChanged = computed(() => !reminderEnabled.value || reminderHour.value !== DEFAULT_REMINDER_HOUR)

async function saveReminderIfChanged() {
  if (!reminderChanged.value) return
  // Never blocks the onboarding: Configurações is the fallback
  const saved = await runAction(() => $api('/settings', {
    method: 'PUT',
    body: { reminder_enabled: reminderEnabled.value, reminder_hour: reminderHour.value },
  }), { error: 'Não conseguimos salvar seu lembrete. Ajuste em Configurações.' })
  if (saved !== undefined) track('reminder_toggled', { on: reminderEnabled.value, hour: reminderHour.value, source: 'onboarding' })
}

/** Throws on failure (RF-F4.6): callers only navigate after the flag is saved. */
async function completeOnboarding(): Promise<true> {
  await saveReminderIfChanged()
  await $api('/onboarding/complete', { method: 'POST' })
  if (auth.user) auth.user.onboarding_completed = true
  return true
}

async function finishAndGo(to: string, path: OnboardingPath) {
  if (completing.value) return
  completing.value = true
  const ok = await runAction(completeOnboarding, { error: 'Não conseguimos concluir seu cadastro. Tente de novo.' })
  completing.value = false
  if (!ok) return
  track('onboarding_completed', { path, learning_mode: selectedMode.value || null })
  await navigateTo(to)
}

function goToAnkiImport() {
  return finishAndGo('/importar', 'import_anki')
}

function goToNotebook() {
  return finishAndGo(createdTopicId.value ? `/cadernos?topic=${createdTopicId.value}` : '/cadernos', 'notebook')
}

function goToReview() {
  return finishAndGo(createdTopicId.value ? `/revisar?topic_id=${createdTopicId.value}` : '/revisar', 'review')
}

function goToDashboard() {
  return finishAndGo('/hoje', 'home')
}

function skipToApp() {
  return finishAndGo('/hoje', 'skip')
}
</script>
