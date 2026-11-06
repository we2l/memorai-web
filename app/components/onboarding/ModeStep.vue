<template>
  <form class="flex max-w-2xl flex-col gap-5" data-testid="mode-step" novalidate @submit.prevent="submit">
    <div>
      <h1 class="text-page-title-sm text-fg-strong outline-none sm:text-page-title" tabindex="-1">Como você vai estudar?</h1>
      <p class="mt-1 text-body text-fg-muted">O Baigi organiza as telas e os cards de acordo com o seu objetivo.</p>
    </div>

    <UiRadioGroup v-model="mode" label="Modo de estudo" hide-label name="learning-mode" variant="cards" :columns="2" :options="OPTIONS" />

    <UiInput
      v-if="mode === 'exam' || mode === 'academic'"
      id="exam-date"
      v-model="examDate"
      class="max-w-xs"
      label="Quando é a sua prova?"
      optional
      type="date"
      :min="tomorrow"
      hint="Usamos para priorizar a revisão perto da prova."
      :error="dateError || undefined"
    />

    <div>
      <UiButton variant="primary" type="submit" :disabled="!mode" :loading="saving">Continuar</UiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Step 1 of the onboarding (prd-4g-conta-onboarding-v3 RF-F5): the modes with one line of what changes, and
// the optional exam date for concurso and faculdade (the exam is created once the cards exist).
import { LEARNING_MODES } from '~/utils/learningModes'

const mode = defineModel<string>('mode', { required: true })
const examDate = defineModel<string>('examDate', { required: true })

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ (e: 'next'): void }>()

// The names are the app's (Configurações and "Novo caderno"); here each one says what changes
const WHAT_CHANGES: Record<string, string> = {
  exam: 'Questões no centro e a prova no topo.',
  academic: 'Suas matérias, os materiais e as provas do semestre.',
  language: 'Palavras e frases em lotes curtos, todos os dias.',
  technical: 'Conceitos e comandos para lembrar na hora de usar.',
  professional: 'Certificações e o que você usa no trabalho.',
  general: 'Serve para qualquer assunto.',
}
const OPTIONS = LEARNING_MODES.map(m => ({ value: m.value, label: m.label, description: WHAT_CHANGES[m.value] }))

const tomorrow = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const needsDate = computed(() => mode.value === 'exam' || mode.value === 'academic')
const dateError = ref('')

function submit() {
  dateError.value = ''
  if (!mode.value) return
  // novalidate turns the native `min` off, and the API refuses a date that is not in the future
  if (needsDate.value && examDate.value && examDate.value < tomorrow) {
    dateError.value = 'Escolha uma data a partir de amanhã.'
    return
  }
  emit('next')
}
</script>
