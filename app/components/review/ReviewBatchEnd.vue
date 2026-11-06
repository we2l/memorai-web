<template>
  <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-gutter py-10 text-center" data-testid="review-batch-end" :data-kind="goalMet ? 'goal' : 'batch'">
    <UiCelebration :kind="goalMet ? 'goal' : 'batch'" :title="title" :subtitle="subtitle" :level="1" />
    <p class="-mt-2 max-w-md text-body text-fg">{{ lead }}</p>

    <!-- Meta of the day (the server's): yellow only here, always with the text -->
    <div v-if="goal" class="w-full max-w-sm" data-testid="batch-goal">
      <p class="mb-2 flex justify-between text-meta text-fg-muted">
        <span>Meta de hoje</span>
        <span class="font-semibold text-fg-strong">{{ goal.done_batches }} de {{ goal.target_batches }} {{ goal.target_batches === 1 ? 'lote' : 'lotes' }}</span>
      </p>
      <UiProgressBar :value="Math.min(goal.done_batches, goal.target_batches)" :max="goal.target_batches" :segments="goal.target_batches" tone="celebrate" size="md" :label="`Meta de hoje: ${goal.done_batches} de ${goal.target_batches} lotes`" />
    </div>
    <UiSkeleton v-else-if="statsLoading" variant="text" :lines="1" class="w-full max-w-sm" />

    <div class="flex flex-wrap justify-center gap-6" data-testid="batch-stats">
      <UiStat :value="`${summary.percent}%`" label="lembrou" />
      <UiStat :value="`${summary.minutes} min`" label="de foco" />
      <UiStat :value="`+${summary.inDay}`" :label="summary.inDay === 1 ? 'card em dia' : 'cards em dia'" />
    </div>

    <p
      v-if="streak && streak.current > 0"
      class="flex items-center gap-2 text-body font-semibold text-streak-fg"
      :class="streak.extendedNow && 'motion-safe:animate-celebrate-pop'"
      data-testid="batch-streak"
    >
      <Flame class="size-5 fill-current text-streak" aria-hidden="true" />
      {{ streak.current }} {{ streak.current === 1 ? 'dia seguido' : 'dias seguidos' }}<template v-if="streak.record"> · recorde pessoal</template>
    </p>

    <div class="flex w-full max-w-xs flex-col gap-2">
      <UiButton variant="primary" block :aria-keyshortcuts="'Enter'" data-testid="batch-next" @click="$emit('next')">
        Próximo lote ({{ nextCount }})
      </UiButton>
      <UiButton variant="ghost" block :to="backTo" :aria-keyshortcuts="'Escape'" data-testid="batch-stop" @click="$emit('stop')">{{ backLabel }}</UiButton>
    </div>

    <p v-if="summary.weak && weakTo" class="w-full max-w-md border-t border-line pt-4 text-left text-body text-fg" data-testid="batch-weak">
      Onde você mais errou: <span class="font-semibold text-fg-strong">{{ summary.weak.name }}</span> ·
      <UiLink :to="weakTo">{{ language ? 'Reforçar estes erros' : 'treinar com 10 questões' }} →</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// End of a batch (prd-4d-revisao-v3 RF-F5): the achievement moment (UiCelebration with the mascot, ≤ 700 ms,
// still with prefers-reduced-motion), "Você lembrou 17 de 20", the goal of the day from the server, the
// streak (record when current = longest ≥ 3), one primary "Próximo lote (N)" and the way out. The weak
// subject (≥ 3 "De novo" in the batch) points to 10 questions, or to these errors in the language mode.
import { Flame } from 'lucide-vue-next'
import type { BatchSummary } from '~/composables/useReviewBatches'

export interface GoalInfo { batch_size: number; target_batches: number; done_batches: number; met: boolean }
export interface StreakInfo { current: number; record: boolean; extendedNow: boolean }

const props = defineProps<{
  index: number
  summary: BatchSummary
  goal: GoalInfo | null
  goalMet: boolean
  streak: StreakInfo | null
  statsLoading?: boolean
  nextCount: number
  backTo: string
  backLabel: string
  language?: boolean
}>()
defineEmits<{ (e: 'next'): void; (e: 'stop'): void }>()

const title = computed(() => (props.goalMet ? 'Meta de hoje cumprida!' : 'Lote concluído!'))
const subtitle = computed(() => (props.goalMet ? `Lote ${props.index} concluído` : `Lote ${props.index}`))
const lead = computed(() => `Você lembrou ${props.summary.remembered} de ${props.summary.size}. O resto entra amanhã sem virar atraso: pode parar aqui se quiser.`)
const weakTo = computed(() => {
  const w = props.summary.weak
  if (!w) return null
  if (props.language) return props.summary.errorIds.length ? `/revisar?scope=cards&card_ids=${props.summary.errorIds.slice(0, 100).join(',')}` : null
  return `/simulados?topic_id=${w.id}&count=10`
})

onMounted(() => {
  void nextTick(() => document.querySelector<HTMLElement>('[data-testid=review-batch-end] [data-celebration-title]')?.focus())
})
</script>
