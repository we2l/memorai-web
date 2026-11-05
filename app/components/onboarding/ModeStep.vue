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
    />

    <div>
      <UiButton variant="primary" type="submit" :disabled="!mode" :loading="saving">Continuar</UiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Step 1 of the onboarding (prd-4g-conta-onboarding-v3 RF-F5): the modes with one line of what changes, and
// the optional exam date for concurso and faculdade (the exam is created once the cards exist).
const mode = defineModel<string>('mode', { required: true })
const examDate = defineModel<string>('examDate', { required: true })

defineProps<{ saving?: boolean }>()
const emit = defineEmits<{ (e: 'next'): void }>()

const OPTIONS = [
  { value: 'exam', label: 'Concurso ou OAB', description: 'Questões no centro e a prova no topo.' },
  { value: 'academic', label: 'Faculdade', description: 'Suas matérias, os materiais e as provas do semestre.' },
  { value: 'language', label: 'Idiomas', description: 'Palavras e frases em lotes curtos, todos os dias.' },
  { value: 'technical', label: 'Técnico', description: 'Conceitos e comandos para lembrar na hora de usar.' },
  { value: 'professional', label: 'Profissional', description: 'Certificações e o que você usa no trabalho.' },
  { value: 'general', label: 'Outro', description: 'Serve para qualquer assunto.' },
]

const tomorrow = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

function submit() {
  if (mode.value) emit('next')
}
</script>
