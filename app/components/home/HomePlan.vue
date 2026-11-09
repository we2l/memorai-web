<template>
  <UiErrorState
    v-if="error"
    title="Não foi possível carregar seu plano de hoje"
    description="Verifique sua conexão e tente de novo."
    @retry="$emit('retry')"
  />

  <UiSection v-else-if="loading || steps.length" :title="title" :aria-busy="loading ? 'true' : undefined" data-testid="home-plan">
    <div v-if="loading">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>
    <ul v-else class="-mx-2 -my-1.5 divide-y divide-hairline">
      <HomePlanStep
        v-for="step in steps"
        :key="step.key"
        :step="step"
        :busy="survivalBusy"
        @act="$emit('act', $event)"
        @survival-off="$emit('survival-off')"
      />
    </ul>
  </UiSection>
</template>

<script setup lang="ts">
// "Plano do dia", E2 (prd-visual-e2 RF-3.4): a list of modes from buildDayPlan, each with the icon of its mode, split
// by the hairline. Only the first step carries the primary button; the others are whole-row links. Loading keeps the
// footprint (3 rows); an error of /stats never turns into "Tudo em dia" (RN-UX-03).
import type { DayPlanStep } from '~/composables/useDayPlan'

withDefaults(defineProps<{
  steps: DayPlanStep[]
  loading?: boolean
  error?: boolean
  survivalBusy?: boolean
  title?: string
}>(), { title: 'Plano do dia' })

defineEmits<{
  (e: 'act', step: DayPlanStep): void
  (e: 'survival-off'): void
  (e: 'retry'): void
}>()
</script>
