<template>
  <UiSection title="Ainda sem material? Revise cards de exemplo" :level="2" data-testid="home-sample-offer">
    <p class="max-w-lg text-body-sm text-fg-muted">Escolha a área. Você revisa agora, sem IA, e o Baigi traz cada card de volta no dia certo.</p>
    <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Área dos cards de exemplo">
      <UiButton
        v-for="option in SAMPLE_OPTIONS"
        :key="option.mode"
        variant="outline"
        size="sm"
        :loading="pending && chosen === option.mode"
        :disabled="pending && chosen !== option.mode"
        :data-testid="`home-sample-${option.mode}`"
        @click="start(option.mode)"
      >
        {{ option.label }}
      </UiButton>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Hoje of an account with no card at all and no sample (it went "Começar pelo meu material" or straight from
// /criar-conta): something to review without AI and without a file at hand (auditoria do onboarding 25/11/2026, R3).
// POST /onboarding/sample makes the sample of the mode (concurso = the 40 cards of the Lei 8.213, 8 a day) and the
// review of its note opens. Secondary: the first steps keep the primary.
import { reviewPath } from '~/utils/reviewScope'

type SampleMode = 'exam' | 'academic' | 'language' | 'general'

const SAMPLE_OPTIONS: { mode: SampleMode; label: string }[] = [
  { mode: 'exam', label: 'Concurso · INSS' },
  { mode: 'academic', label: 'Faculdade' },
  { mode: 'language', label: 'Inglês' },
  { mode: 'general', label: 'Outra' },
]

const chosen = ref<SampleMode | null>(null)
const { run, pending } = useApiAction()

async function start(mode: SampleMode) {
  chosen.value = mode
  const res = await run(
    () => useNuxtApp().$api<{ data: { note_id: string } }>('/onboarding/sample', { method: 'POST', body: { mode } }),
    { error: 'Não conseguimos criar o exemplo agora. Tente de novo.' },
  )
  if (res === undefined) return
  useAnalytics().track('home_sample_started', { mode })
  await navigateTo(reviewPath({ type: 'note', id: res.data.note_id }))
}
</script>
