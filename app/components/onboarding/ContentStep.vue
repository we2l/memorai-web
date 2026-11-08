<template>
  <div class="flex flex-col" data-testid="content-step">
    <form class="flex min-w-0 flex-col gap-5" novalidate @submit.prevent="submit">
      <div>
        <h2 class="text-section text-fg-strong outline-none" tabindex="-1" data-testid="content-title">Agora com o seu material</h2>
        <p class="mt-1 text-body text-fg-muted">Seus cards saem do que você já estuda. A prévia grátis de IA cobre os primeiros.</p>
      </div>

      <UiRadioGroup v-model="path" label="De onde vem o conteúdo" hide-label name="content-path" variant="cards" :options="options" />

      <!-- The AI of the Free preview no longer waits for the e-mail (prd-revisao-v5-fase-a RF-F11); a paid account without
           it (or the preview switched off on the server) still asks first -->
      <UiVerifyEmailBanner v-if="needsAi && !aiReady" inline />

      <div v-if="path === 'text'" class="flex flex-col gap-3" data-testid="text-fields">
        <UiInput
          id="notebook-name"
          v-model="name"
          label="Nome do caderno"
          placeholder="Ex.: Direito Constitucional"
          maxlength="80"
          :error="nameError || undefined"
          @input="nameTouched = true"
          @keydown.stop
        />
        <UiTextarea
          id="material"
          v-model="text"
          label="Seu texto"
          placeholder="Cole aqui um resumo, anotação de aula ou trecho de apostila."
          :rows="6"
          maxlength="5000"
          :hint="`${text.length} de 5.000 caracteres`"
          @keydown.stop
        />
      </div>

      <p v-if="error" role="alert" class="text-meta font-medium text-danger" data-testid="content-error">{{ error }}</p>

      <input ref="fileInput" type="file" accept=".pdf,application/pdf" class="sr-only" tabindex="-1" aria-hidden="true" data-testid="pdf-input" @change="onFile">

      <div class="flex flex-wrap items-center gap-2">
        <UiButton variant="primary" type="submit" :disabled="primaryDisabled" :loading="busy" :aria-describedby="needsAi && !aiReady ? 'verify-email-notice' : undefined" data-testid="content-primary">{{ primaryLabel }}</UiButton>
        <UiButton variant="ghost" :disabled="busy" @click="$emit('back')">Agora não</UiButton>
      </div>

      <UiVerifyEmailBanner v-if="!verified && (aiReady || !needsAi)" compact />
    </form>

  </div>
</template>

<script setup lang="ts">
// "Agora com o seu material" (prd-onboarding-v4 RF-F5), after the visitor's lote is saved: the old step 2 of the v3
// without the sample. The primary changes with the option. Text and PDF use AI: the Free preview runs before the
// e-mail is confirmed (prd-revisao-v5-fase-a RF-F11, `aiReady`), so only the discreet reminder line shows.
export type ContentPath = 'pdf' | 'text' | 'question' | 'anki'

const props = withDefaults(defineProps<{
  verified: boolean
  /** The AI can run now: a confirmed e-mail, or the Free preview (the server lets it through without one) */
  aiReady?: boolean
  busy?: boolean
  error?: string
  nameError?: string
}>(), { aiReady: undefined, busy: false, error: undefined, nameError: undefined })
const aiReady = computed(() => props.aiReady ?? props.verified)
const path = defineModel<ContentPath>('path', { required: true })
const text = defineModel<string>('text', { required: true })
const name = defineModel<string>('name', { required: true })
const nameTouched = defineModel<boolean>('nameTouched', { required: true })
const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'file', file: File): void
  (e: 'back'): void
}>()

const options = computed(() => [
  { value: 'pdf', label: 'Enviar meu PDF ou apostila', description: 'Vira nota e cards em segundo plano; você acompanha no caderno.' },
  { value: 'text', label: 'Colar um texto', description: 'Resumo, lei seca, anotação de aula.' },
  { value: 'question', label: 'Colar uma questão que errei', description: 'A questão vira card com o comentário no verso.' },
  { value: 'anki', label: 'Trazer do Anki', description: 'Seus baralhos vêm com o intervalo e os erros de cada card.' },
])

const PRIMARY: Record<ContentPath, string> = {
  pdf: 'Enviar e gerar cards',
  text: 'Gerar cards do texto',
  question: 'Colar a questão',
  anki: 'Importar do Anki',
}
const primaryLabel = computed(() => PRIMARY[path.value])
const needsAi = computed(() => path.value === 'pdf' || path.value === 'text')
const primaryDisabled = computed(() => (needsAi.value && !aiReady.value) || (path.value === 'text' && !text.value.trim()))

const fileInput = ref<HTMLInputElement | null>(null)

function submit() {
  if (primaryDisabled.value || props.busy) return
  if (path.value === 'pdf') fileInput.value?.click()
  else emit('submit')
}

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) emit('file', file)
}
</script>
