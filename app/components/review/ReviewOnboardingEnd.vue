<template>
  <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-gutter py-10 text-center" data-testid="onboarding-end">
    <UiCelebration kind="milestone" title="Primeiro lote concluído!" subtitle="Seu primeiro marco no Baigi" :level="1" />
    <p class="-mt-2 max-w-md text-body text-fg" data-testid="onboarding-remembered">Você lembrou {{ summary.remembered }} de {{ summary.size }}.</p>

    <OnboardingTomorrow :forecast="forecast" :loading="loading" :failed="failed" />

    <UiButton variant="primary" to="/hoje" class="w-full max-w-xs" data-testid="onboarding-home">Ir para o Hoje</UiButton>
  </div>
</template>

<script setup lang="ts">
// End of the first batch of the onboarding v3 (prd-4g-conta-onboarding-v3 RF-F8; links with ?onboarding=1 still
// open it): the celebration, "Você lembrou", tomorrow and the reminder. Its own lazy component: every other
// session never downloads it.
import type { TomorrowForecast } from '~/types'
import type { BatchSummary } from '~/composables/useReviewBatches'

defineProps<{ summary: BatchSummary; forecast: TomorrowForecast | null; loading?: boolean; failed?: boolean }>()
</script>
