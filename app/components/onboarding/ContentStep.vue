<template>
  <div class="flex flex-col" data-testid="content-step">
    <form class="flex min-w-0 flex-col gap-5" novalidate @submit.prevent="submit">
      <div>
        <h2 class="text-section text-fg-strong outline-none" tabindex="-1" data-testid="content-title">Agora com o seu material</h2>
        <p class="mt-1 text-body text-fg-muted">Seus cards saem do que você já estuda. A prévia grátis de IA cobre os primeiros.</p>
      </div>

      <UiRadioGroup v-model="path" label="De onde vem o conteúdo" hide-label name="content-path" variant="cards" :options="options" />

      <!-- AI needs a confirmed e-mail (RF-F6): never blocks the sample or Anki -->
      <UiVerifyEmailBanner v-if="needsAi && !verified" inline />

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
        <UiButton variant="primary" type="submit" :disabled="primaryDisabled" :loading="busy" :aria-describedby="needsAi && !verified ? 'verify-email-notice' : undefined" data-testid="content-primary">{{ primaryLabel }}</UiButton>
        <UiButton variant="ghost" :disabled="busy" @click="$emit('back')">Agora não</UiButton>
      </div>

      <UiVerifyEmailBanner v-if="!verified && !needsAi" compact />
    </form>

  </div>
</template>

<script setup lang="ts">
// "Agora com o seu material" (prd-onboarding-v4 RF-F5), after the visitor's lote is saved: the old step 2 of the v3
// without the sample. The primary changes with the option. Text and PDF use AI, so the e-mail confirmation shows
// up only when they are chosen; the discreet line stays for the rest.
export type ContentPath = 'pdf' | 'text' | 'question' | 'anki'

const props = defineProps<{ verified: boolean; busy?: boolean; error?: string; nameError?: string }>()
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
  { value: 'anki', label: 'Trazer do Anki', description: 'Seus baralhos e o histórico de revisão vêm junto.' },
])

const PRIMARY: Record<ContentPath, string> = {
  pdf: 'Enviar e gerar cards',
  text: 'Gerar cards do texto',
  question: 'Colar a questão',
  anki: 'Importar do Anki',
}
const primaryLabel = computed(() => PRIMARY[path.value])
const needsAi = computed(() => path.value === 'pdf' || path.value === 'text')
const primaryDisabled = computed(() => (needsAi.value && !props.verified) || (path.value === 'text' && !text.value.trim()))

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
