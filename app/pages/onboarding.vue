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

      <!-- Step 1: Choose how to start -->
      <div v-if="step === 1" class="text-center">
        <h1 class="text-display mb-2">Como você quer começar?</h1>
        <p class="text-base-muted text-small mb-8">Escolha como começar. Você pode mudar depois.</p>

        <div class="space-y-3">
          <!-- Material (PDF/texto) -->
          <button class="card-interactive flex items-center gap-4 w-full" @click="path = 'material'; showMaterialOptions = true">
            <span class="text-2xl">📄</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Tenho material</p>
              <p class="text-micro text-base-muted">PDF, texto, anotações — a IA gera cards pra você</p>
            </div>
          </button>

          <!-- Import Anki -->
          <NuxtLink to="/import" class="card-interactive flex items-center gap-4 w-full" @click="completeOnboarding">
            <span class="text-2xl">📦</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Já uso Anki</p>
              <p class="text-micro text-base-muted">Importar seus decks e continuar de onde parou</p>
            </div>
          </NuxtLink>

          <!-- Create manually -->
          <button class="card-interactive flex items-center gap-4 w-full" @click="path = 'manual'; showManualForm = true">
            <span class="text-2xl">✏️</span>
            <div class="text-left">
              <p class="text-small font-medium text-base-primary">Criar do zero</p>
              <p class="text-micro text-base-muted">Criar tópico e cards manualmente</p>
            </div>
          </button>
        </div>

        <!-- Material sub-options -->
        <div v-if="showMaterialOptions" class="mt-6 space-y-3">
          <p class="text-label">Adicione seu material</p>
          <label class="card-interactive flex items-center gap-3 cursor-pointer">
            <input type="file" accept=".pdf" class="hidden" @change="handlePdf" />
            <span>📄</span>
            <span class="text-small text-base-primary">Subir PDF</span>
          </label>
          <button class="card-interactive flex items-center gap-3 w-full" @click="materialMode = 'text'; showTextInput = true; showMaterialOptions = false">
            <span>📝</span>
            <span class="text-small text-base-primary">Colar ou escrever texto</span>
          </button>
          <button class="card-interactive flex items-center gap-3 w-full" @click="materialMode = 'free'; showTextInput = true; showMaterialOptions = false">
            <span>💡</span>
            <span class="text-small text-base-primary">Só digitar o tema</span>
          </button>
        </div>

        <!-- Text input for material -->
        <div v-if="showTextInput" class="mt-4">
          <textarea
            v-model="textInput"
            class="textarea-base"
            :rows="materialMode === 'free' ? 2 : 5"
            :placeholder="materialMode === 'free' ? 'Ex: Direito Constitucional — Art. 5º' : 'Cole ou escreva seu conteúdo...'"
            autofocus
          />
          <button class="btn-primary w-full mt-3" :disabled="!textInput.trim() || generating" @click="generateFromText">
            {{ generating ? 'Gerando cards...' : 'Gerar cards →' }}
          </button>
        </div>

        <!-- Manual card form -->
        <div v-if="showManualForm" class="mt-6">
          <p class="text-label mb-3">Seu primeiro card</p>
          <input v-model="manualFront" class="input-base w-full mb-2" placeholder="Frente — pergunta ou conceito" />
          <textarea v-model="manualBack" class="textarea-base w-full" rows="3" placeholder="Verso — resposta" />
          <button class="btn-primary w-full mt-3" :disabled="!manualFront.trim() || !manualBack.trim() || generating" @click="createManualCard">
            {{ generating ? 'Criando...' : 'Criar card →' }}
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="generating && !showTextInput && !showManualForm" class="mt-8 text-center">
          <div class="animate-pulse text-accent-primary text-2xl mb-2">⏳</div>
          <p class="text-small text-base-muted">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- Step 2: Ready -->
      <div v-else class="text-center">
        <p class="text-4xl mb-4">✨</p>
        <h1 class="text-display mb-2">{{ resultMessage }}</h1>
        <p class="text-base-muted text-small mb-6">Comece a revisar e o Memorai adapta ao seu ritmo.</p>

        <NuxtLink to="/review" class="btn-primary glow-primary w-full justify-center" @click="completeOnboarding">
          Começar revisão →
        </NuxtLink>
        <button class="btn-secondary w-full mt-3 justify-center" @click="goToToday">
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
const path = ref<'material' | 'anki' | 'manual'>('material')
const showMaterialOptions = ref(false)
const showTextInput = ref(false)
const showManualForm = ref(false)
const materialMode = ref<'pdf' | 'text' | 'free'>('free')
const textInput = ref('')
const manualFront = ref('')
const manualBack = ref('')
const generating = ref(false)
const generatedCount = ref(0)
const loadingMessage = ref('Processando...')

const resultMessage = computed(() => {
  if (path.value === 'manual') return 'Seu primeiro card está pronto!'
  return `Seus ${generatedCount.value} cards estão prontos!`
})

async function handlePdf(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  showMaterialOptions.value = false
  generating.value = true
  loadingMessage.value = 'Enviando PDF...'

  try {
    const topicName = file.name.replace(/\.pdf$/i, '')
    const deckRes = await $api<any>('/decks', { method: 'POST', body: { name: topicName } })
    const deckId = deckRes.data.id
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name: topicName } })
    const topicId = topicRes.data.id

    const config = useRuntimeConfig()
    const token = useCookie('auth_token').value
    const formData = new FormData()
    formData.append('file', file)
    formData.append('topic_id', topicId)

    loadingMessage.value = 'Enviando PDF...'
    const docRes: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => xhr.status < 400 ? resolve(JSON.parse(xhr.responseText)) : reject()
      xhr.onerror = () => reject()
      xhr.open('POST', `${config.public.apiBase}/documents`)
      xhr.setRequestHeader('Accept', 'application/json')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })

    loadingMessage.value = 'Processando conteúdo...'
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
      generatedCount.value = 0
      step.value = 2
      return
    }

    loadingMessage.value = 'Gerando cards com IA...'
    const genRes = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: { source: 'pdf', deck_id: deckId, document_id: docId, topic_id: topicId, count: 5 },
    })

    const cards = genRes.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', { method: 'POST', body: { deck_id: deckId, cards: cards.map((c: any) => ({ ...c, topic_id: topicId })) } })
    }
    generatedCount.value = cards.length
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
    const name = materialMode.value === 'free' ? textInput.value.slice(0, 50) : 'Meu estudo'
    const deckRes = await $api<any>('/decks', { method: 'POST', body: { name } })
    const deckId = deckRes.data.id
    const topicRes = await $api<any>('/topics', { method: 'POST', body: { name } })
    const topicId = topicRes.data.id

    const res = await $api<any>('/ai/generate-cards', {
      method: 'POST',
      body: {
        source: materialMode.value === 'free' ? 'free' : 'notes',
        prompt: textInput.value,
        deck_id: deckId,
        topic_id: topicId,
        count: 5,
      },
    })

    const cards = res.data?.cards ?? []
    if (cards.length) {
      await $api('/ai/accept-cards', { method: 'POST', body: { deck_id: deckId, cards: cards.map((c: any) => ({ ...c, topic_id: topicId })) } })
    }
    generatedCount.value = cards.length
    step.value = 2
  } catch {
    toast.show('Erro ao gerar cards.', 'error')
  } finally {
    generating.value = false
  }
}

async function createManualCard() {
  if (!manualFront.value.trim() || !manualBack.value.trim()) return
  generating.value = true

  try {
    const deckRes = await $api<any>('/decks', { method: 'POST', body: { name: 'Meu estudo' } })
    const deckId = deckRes.data.id
    await $api<any>('/topics', { method: 'POST', body: { name: 'Meu estudo' } })

    await $api('/flashcards', {
      method: 'POST',
      body: { deck_id: deckId, front: manualFront.value, back: manualBack.value },
    })
    generatedCount.value = 1
    step.value = 2
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    generating.value = false
  }
}

async function completeOnboarding() {
  try {
    await $api('/onboarding/complete', { method: 'POST' })
    if (auth.user) auth.user.onboarding_completed = true
  } catch {}
}

async function goToToday() {
  await completeOnboarding()
  await navigateTo('/today')
}
</script>
