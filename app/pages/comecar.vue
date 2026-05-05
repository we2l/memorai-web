<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
    <div class="w-full max-w-md">

      <!-- Step 1: Input -->
      <div v-if="step === 1">
        <h1 class="text-display text-center mb-2">Pare de esquecer o que estuda</h1>
        <p class="text-base-muted text-small text-center mb-8">Cole seu material abaixo e a IA gera flashcards em segundos.</p>

        <textarea
          v-model="textInput"
          class="textarea-base w-full"
          rows="6"
          placeholder="Cole aqui um resumo, anotação de aula, trecho de apostila..."
          autofocus
          maxlength="5000"
          @keydown.stop
        />
        <div class="flex justify-between mt-1">
          <p v-if="error" role="alert" class="text-danger text-micro">{{ error }}</p>
          <span v-else />
          <span class="text-micro text-base-muted">{{ textInput.length }}/5000</span>
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
          <div class="flex-1 h-px bg-border" />
          <span class="text-micro text-base-muted">ou</span>
          <div class="flex-1 h-px bg-border" />
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
            <input type="file" accept=".pdf" class="hidden" @change="handlePdf" />
            📄 Subir PDF
          </label>
          <NuxtLink to="/importar" class="btn-secondary flex-1 justify-center !py-2.5 text-small" @click="completeOnboarding">
            📦 Importar Anki
          </NuxtLink>
        </div>

        <button class="w-full text-center text-micro text-base-muted mt-4 hover:text-base-secondary" @click="skipToApp">
          Pular e explorar o app →
        </button>
      </div>

      <!-- Step 2: Processing -->
      <div v-else-if="step === 2" class="text-center">
        <div class="animate-spin w-10 h-10 border-3 border-accent-primary border-t-transparent rounded-full mx-auto mb-6" />
        <p class="text-title text-base-primary mb-2">{{ loadingMessage }}</p>
        <p class="text-small text-base-muted">Isso leva poucos segundos...</p>
      </div>

      <!-- Step 3: Success → Review -->
      <div v-else-if="step === 3" class="text-center">
        <p class="text-4xl mb-4">✨</p>
        <h1 class="text-display mb-2">{{ generatedCount }} cards prontos!</h1>
        <p class="text-small text-base-muted mb-8">Vamos revisar os primeiros para você ver como funciona.</p>

        <button class="btn-primary w-full !py-3 text-base font-semibold glow-primary" @click="goToReview">
          Começar revisão →
        </button>
        <button class="btn-secondary w-full mt-3 justify-center" @click="goToDashboard">
          Explorar o app primeiro
        </button>
      </div>

      <!-- Step PDF processing (background) -->
      <div v-else-if="step === 4" class="text-center">
        <p class="text-4xl mb-4">📄</p>
        <h1 class="text-display mb-2">PDF enviado!</h1>
        <p class="text-small text-base-muted mb-8">Estamos processando em segundo plano. Você receberá os cards em breve.</p>

        <button class="btn-primary w-full !py-3 text-base font-semibold" @click="goToDashboard">
          Explorar o app →
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const toast = useToast()

const step = ref(1)
const textInput = ref('')
const topicInput = ref('')
const generating = ref(false)
const generatedCount = ref(0)
const loadingMessage = ref('Analisando material...')
const createdTopicId = ref('')
const error = ref('')

async function generateFromText() {
  if (!textInput.value.trim()) return
  error.value = ''
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
    // Create topic from first 50 chars
    const name = textInput.value.slice(0, 50).replace(/\n/g, ' ').trim()
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
    createdTopicId.value = topicRes.data.id

    // Save text as a note in the topic
    await $api<any>(`/topics/${createdTopicId.value}/notes`, {
      method: 'POST',
      body: { title: 'Material inicial', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: textInput.value }] }] } },
    })

    // Generate cards
    const res = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: {
        source: 'notes',
        prompt: textInput.value,
        topic_id: createdTopicId.value,
        count: 10,
      },
    })

    const cards = res.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: { cards: cards.map((c: any) => ({ ...c, topic_id: createdTopicId.value })) },
      })
    }

    generatedCount.value = cards.length
    step.value = 3
  } catch (e: any) {
    const msg = e.data?.message || e.data?.errors?.prompt?.[0] || 'Erro ao gerar cards. Tente novamente.'
    error.value = msg
    step.value = 1
    generating.value = false
  } finally {
    clearInterval(interval)
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
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
    createdTopicId.value = topicRes.data.id

    const res = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: {
        source: 'free',
        prompt: name,
        topic_id: createdTopicId.value,
        count: 10,
      },
    })

    const cards = res.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', {
        method: 'POST',
        body: { cards: cards.map((c: any) => ({ ...c, topic_id: createdTopicId.value })) },
      })
    }
    generatedCount.value = cards.length
    step.value = 3
  } catch (e: any) {
    const msg = e.data?.message || 'Erro ao gerar cards. Tente novamente.'
    error.value = msg
    step.value = 1
    generating.value = false
  } finally {
    clearInterval(interval)
  }
}

async function handlePdf(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  step.value = 2
  loadingMessage.value = 'Enviando PDF...'

  try {
    const name = file.name.replace(/\.pdf$/i, '')
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
    createdTopicId.value = topicRes.data.id

    const config = useRuntimeConfig()
    const token = useCookie('auth_token').value
    const formData = new FormData()
    formData.append('file', file)
    formData.append('topic_id', createdTopicId.value)

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => xhr.status < 400 ? resolve(JSON.parse(xhr.responseText)) : reject()
      xhr.onerror = () => reject()
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })

    step.value = 4
  } catch {
    toast.show('Erro ao enviar PDF.', 'error')
    step.value = 1
  }
}

async function completeOnboarding() {
  try {
    await $api('/onboarding/complete', { method: 'POST' })
    if (auth.user) auth.user.onboarding_completed = true
  } catch {}
}

async function goToReview() {
  await completeOnboarding()
  await navigateTo('/revisar')
}

async function goToDashboard() {
  await completeOnboarding()
  await navigateTo('/hoje')
}

async function skipToApp() {
  await completeOnboarding()
  await navigateTo('/hoje')
}
</script>
