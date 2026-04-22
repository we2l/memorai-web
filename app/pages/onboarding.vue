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
    const formData = new FormData()
    formData.append('file', file)
    formData.append('auto_generate', '1')
    formData.append('quantity', '5')
    await $api('/documents', { method: 'POST', body: formData })
    generatedCount.value = 5
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
    const res = await $api<any>('/flashcards/generate', {
      method: 'POST',
      body: {
        source: mode.value === 'free' ? 'free' : 'text',
        prompt: textInput.value,
        quantity: 5,
      },
    })
    generatedCount.value = res.data?.cards_count ?? 5
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
