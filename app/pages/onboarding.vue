<template>
  <div class="min-h-screen bg-surface flex items-center justify-center p-6">
    <div class="w-full max-w-md">
      <!-- Progress dots -->
      <div class="flex justify-center gap-2 mb-8">
        <span
          v-for="i in 2"
          :key="i"
          class="w-2.5 h-2.5 rounded-full transition-colors"
          :class="step === i ? 'bg-accent-primary' : 'bg-surface-tertiary'"
        />
      </div>

      <!-- Step 1: Add material -->
      <div v-if="step === 1" class="text-center">
        <h1 class="text-display mb-2">Comece a estudar</h1>
        <p class="text-base-muted text-small mb-8">Adicione seu material e a IA gera seus primeiros cards.</p>

        <div class="space-y-3">
          <label
            class="card-interactive flex items-center gap-4 cursor-pointer"
          >
            <input type="file" accept=".pdf" class="hidden" @change="handlePdf" />
            <span class="text-2xl">📄</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Subir PDF</p>
              <p class="text-micro text-base-muted">Apostila, resumo, material de aula</p>
            </div>
          </label>

          <button class="card-interactive flex items-center gap-4 w-full" @click="mode = 'text'; showTextInput = true">
            <span class="text-2xl">📝</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Colar ou escrever</p>
              <p class="text-micro text-base-muted">Cole um texto ou escreva suas anotações</p>
            </div>
          </button>

          <button class="card-interactive flex items-center gap-4 w-full" @click="mode = 'free'; showTextInput = true">
            <span class="text-2xl">✏️</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Só digitar o tema</p>
              <p class="text-micro text-base-muted">Ex: Direito Constitucional — Art. 5º</p>
            </div>
          </button>
        </div>

        <!-- Text input -->
        <div v-if="showTextInput" class="mt-4">
          <textarea
            v-model="textInput"
            class="textarea-base"
            :rows="mode === 'free' ? 2 : 5"
            :placeholder="mode === 'free' ? 'Digite o tema...' : 'Cole ou escreva seu conteúdo...'"
            autofocus
          />
          <button
            class="btn-primary w-full mt-3"
            :disabled="!textInput.trim() || generating"
            @click="generateFromText"
          >
            {{ generating ? 'Gerando cards...' : 'Continuar →' }}
          </button>
        </div>
      </div>

      <!-- Step 2: Cards ready -->
      <div v-else class="text-center">
        <p class="text-4xl mb-4">✨</p>
        <h1 class="text-display mb-2">Seus {{ generatedCount }} cards estão prontos!</h1>
        <p class="text-base-muted text-small mb-6">Comece a revisar e a IA vai adaptar ao seu ritmo.</p>

        <NuxtLink to="/review" class="btn-primary glow-primary w-full justify-center" @click="completeOnboarding">
          Começar revisão →
        </NuxtLink>

        <button class="btn-secondary w-full mt-3 justify-center" @click="completeOnboarding">
          Explorar primeiro
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
const mode = ref<'pdf' | 'text' | 'free'>('free')
const showTextInput = ref(false)
const textInput = ref('')
const generating = ref(false)
const generatedCount = ref(5)

async function handlePdf(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  mode.value = 'pdf'
  generating.value = true
  toast.show('Processando PDF...', 'success')

  try {
    // 1. Create a deck + topic from filename
    const topicName = file.name.replace(/\.pdf$/i, '')
    const deckRes = await $api<any>('/decks', { method: 'POST', body: { name: topicName } })
    const deckId = deckRes.data.id
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name: topicName } })
    const topicId = topicRes.data.id

    // 2. Upload PDF linked to topic
    const config = useRuntimeConfig()
    const token = useCookie('auth_token').value
    const formData = new FormData()
    formData.append('file', file)
    formData.append('topic_id', topicId)

    const docRes: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => xhr.status < 400 ? resolve(JSON.parse(xhr.responseText)) : reject()
      xhr.onerror = () => reject()
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })

    // 3. Wait for processing (poll)
    toast.show('Processando conteúdo...', 'success')
    const docId = docRes.data.id
    let ready = false
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000))
      const status = await $api<any>(`/documents/${docId}`)
      if (status.data.status === 'completed') { ready = true; break }
      if (status.data.status === 'failed') break
    }

    if (!ready) {
      toast.show('PDF ainda processando. Gere cards depois no tópico.', 'error')
      step.value = 2
      generatedCount.value = 0
      return
    }

    // 4. Generate cards from PDF
    toast.show('Gerando cards com IA...', 'success')
    const genRes = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: { source: 'pdf', deck_id: deckId, document_id: docId, topic_id: topicId, count: 5 },
    })

    // 5. Accept all generated cards
    const cards = genRes.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', { method: 'POST', body: { deck_id: deckId, cards } })
    }

    generatedCount.value = cards.length || 5
    step.value = 2
  } catch {
    toast.show('Erro ao processar PDF.', 'error')
  } finally {
    generating.value = false
  }
}

async function generateFromText() {
  if (!textInput.value.trim()) return
  generating.value = true

  try {
    // 1. Create deck + topic
    const name = mode.value === 'free' ? textInput.value.slice(0, 50) : 'Meu estudo'
    const deckRes = await $api<any>('/decks', { method: 'POST', body: { name } })
    const deckId = deckRes.data.id
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
    const topicId = topicRes.data.id

    // 2. Generate cards
    const res = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: {
        source: mode.value === 'free' ? 'free' : 'notes',
        prompt: textInput.value,
        deck_id: deckId,
        topic_id: topicId,
        count: 5,
      },
    })

    // 3. Accept all
    const cards = res.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', { method: 'POST', body: { deck_id: deckId, cards } })
    }

    generatedCount.value = cards.length || 5
    step.value = 2
  } catch {
    toast.show('Erro ao gerar cards.', 'error')
  } finally {
    generating.value = false
  }
}

async function completeOnboarding() {
  try {
    await $api('/onboarding/complete', { method: 'POST' })
    if (auth.user) auth.user.onboarding_completed = true
  } catch {}
  await navigateTo('/today')
}
</script>
