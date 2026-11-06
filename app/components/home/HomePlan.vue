<template>
  <UiErrorState
    v-if="error"
    title="Não foi possível carregar seu plano de hoje"
    description="Verifique sua conexão e tente de novo."
    @retry="$emit('retry')"
  />

  <UiSection v-else-if="loading || steps.length" title="Plano do dia" :aria-busy="loading ? 'true' : undefined" data-testid="home-plan">
    <div v-if="loading">
      <UiSkeleton v-for="i in 3" :key="i" variant="row" />
    </div>
    <ul v-else class="-my-2 divide-y divide-line">
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
// "Plano do dia" (prd-4a-hoje-v3 RF-F3, §5.2): up to 4 steps from buildDayPlan, with a divider. Loading
// keeps the footprint (3 rows); an error of /stats never turns into "Tudo em dia" (RN-UX-03).
import type { DayPlanStep } from '~/composables/useDayPlan'

defineProps<{
  steps: DayPlanStep[]
  loading?: boolean
  error?: boolean
  survivalBusy?: boolean
}>()

defineEmits<{
  (e: 'act', step: DayPlanStep): void
  (e: 'survival-off'): void
  (e: 'retry'): void
}>()
</script>
