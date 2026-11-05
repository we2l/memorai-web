<template>
  <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start" data-testid="content-step">
    <form class="flex min-w-0 flex-col gap-5" novalidate @submit.prevent="submit">
      <div>
        <h1 class="text-page-title-sm text-fg-strong outline-none sm:text-page-title" tabindex="-1">Vamos criar seus primeiros cards</h1>
        <p class="mt-1 text-body text-fg-muted">Escolha de onde vem o conteúdo. Em menos de 1 minuto você faz sua primeira revisão.</p>
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
        <UiButton variant="ghost" :disabled="busy" @click="$emit('back')">Voltar</UiButton>
      </div>

      <p class="text-meta text-fg-muted">
        Prefere olhar primeiro? <button type="button" class="font-semibold text-action-fg underline" :disabled="busy" data-testid="content-skip" @click="$emit('skip')">Explorar o app sem cards</button>
      </p>

      <UiVerifyEmailBanner v-if="!verified && !needsAi" compact />
    </form>

    <OnboardingSamplePreview class="max-lg:hidden" :mode="mode" />
  </div>
</template>

<script setup lang="ts">
// Step 2 of the onboarding (prd-4g-conta-onboarding-v3 RF-F5, F6): the sample is the default (no AI, no quota,
// no e-mail confirmation), and the primary changes with the option. Text and PDF use AI, so the confirmation
// shows up only when they are chosen; the discreet line stays for the rest.
import { samplePreview } from '~/utils/onboardingSamples'

export type ContentPath = 'sample' | 'pdf' | 'text' | 'anki'

const props = defineProps<{ mode: string; verified: boolean; busy?: boolean; error?: string; nameError?: string }>()
const path = defineModel<ContentPath>('path', { required: true })
const text = defineModel<string>('text', { required: true })
const name = defineModel<string>('name', { required: true })
const nameTouched = defineModel<boolean>('nameTouched', { required: true })
const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'file', file: File): void
  (e: 'back'): void
  (e: 'skip'): void
}>()

const options = computed(() => [
  { value: 'sample', label: 'Usar um material de exemplo', description: `${samplePreview(props.mode).title} · 3 páginas. Bom para conhecer o Baigi sem gastar nada.` },
  { value: 'pdf', label: 'Enviar meu PDF ou apostila', description: 'Vira nota e cards em segundo plano; você acompanha no caderno.' },
  { value: 'text', label: 'Colar um texto', description: 'Resumo, lei seca, anotação de aula.' },
  { value: 'anki', label: 'Trazer do Anki', description: 'Seus baralhos e o histórico de revisão vêm junto.' },
])

const PRIMARY: Record<ContentPath, string> = {
  sample: 'Criar 8 cards e revisar',
  pdf: 'Enviar e gerar cards',
  text: 'Gerar cards do texto',
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
