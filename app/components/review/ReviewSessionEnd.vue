<template>
  <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-gutter py-10 text-center" data-testid="review-session-end" :data-kind="goalMet ? 'goal' : 'batch'">
    <UiCelebration :kind="goalMet ? 'goal' : 'batch'" :title="title" :subtitle="goalMet ? 'Meta de hoje cumprida' : 'Sessão concluída'" :level="1" />
    <p class="-mt-2 max-w-md text-body text-fg">{{ lead }}</p>

    <div class="flex flex-wrap justify-center gap-6" data-testid="session-stats">
      <UiStat :value="summary.size" :label="summary.size === 1 ? 'card revisado' : 'cards revisados'" />
      <UiStat v-if="summary.far > 0" :value="summary.far" :label="summary.far === 1 ? 'só volta daqui a 1 semana ou mais' : 'só voltam daqui a 1 semana ou mais'" data-testid="session-far" />
      <UiStat :value="`${summary.minutes} min`" label="de foco" />
    </div>

    <div v-if="goal" class="w-full max-w-sm" data-testid="session-goal">
      <p class="mb-2 flex justify-between text-meta text-fg-muted">
        <span>Meta de hoje</span>
        <span class="font-semibold text-fg-strong">{{ goal.done_batches }} de {{ goal.target_batches }} {{ goal.target_batches === 1 ? 'lote' : 'lotes' }}</span>
      </p>
      <UiProgressBar :value="Math.min(goal.done_batches, goal.target_batches)" :max="goal.target_batches" :segments="goal.target_batches" tone="celebrate" size="md" :label="`Meta de hoje: ${goal.done_batches} de ${goal.target_batches} lotes`" />
    </div>

    <ReviewStreakLine v-if="streak && streak.current > 0" :streak="streak" data-testid="session-streak" />

    <div class="flex w-full flex-col gap-3">
      <slot name="tomorrow" />
      <!-- The backlog left out of today (prd-revisao-v5-fase-b RF-F4) -->
      <LazyBacklogLine v-if="backlog" :backlog="backlog" origin="review_end" class="items-center" />
      <LazyReviewRetentionHint v-if="retention" />
    </div>

    <div class="flex w-full max-w-xs flex-col gap-2">
      <UiButton variant="primary" block :to="backTo" data-testid="session-back">{{ backLabel }}</UiButton>
      <UiButton v-if="errorsTo && errorsCount" block :to="errorsTo" data-testid="session-errors">Reforçar erros ({{ errorsCount }})</UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// End of the session (prd-4d-revisao-v3 RF-F6): the layout of the batch end with the numbers of the whole
// session, tomorrow's forecast and the reminder, the retention suggestion when it applies, "Voltar a
// {escopo}" (the primary) and "Reforçar erros (N)" in the same slice.
import type { BacklogState } from '~/types'
import type { BatchSummary } from '~/composables/useReviewBatches'
import type { GoalInfo, StreakInfo } from '~/components/review/ReviewBatchEnd.vue'

const props = defineProps<{
  summary: BatchSummary
  /** "TRF 4ª Região" when the session was a slice: "{escopo} em dia" */
  scopeLabel?: string | null
  goal: GoalInfo | null
  goalMet: boolean
  streak: StreakInfo | null
  backTo: string
  backLabel: string
  errorsTo?: string | null
  errorsCount?: number | null
  /** Ask the retention suggestion (not in blitz, not in an errors-only session) */
  retention?: boolean
  /** /stats.backlog after the session (prd-revisao-v5-fase-b RF-F4) */
  backlog?: BacklogState | null
}>()

const title = computed(() => (props.scopeLabel ? `${props.scopeLabel} em dia` : 'Revisão de hoje concluída'))
// Owner's review of 12/11/2026: "0 de 2" alone read as a failure; say what happens to the ones missed.
const lead = computed(() => `Você lembrou ${props.summary.remembered} de ${props.summary.size}.${props.summary.remembered < props.summary.size ? ' Os erros voltam logo.' : ''}`)
</script>
