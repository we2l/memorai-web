<template>
  <div class="mx-auto flex w-full max-w-xl flex-col items-center px-gutter pb-6 pt-2 text-center lg:pt-10" data-testid="review-batch-end" :data-kind="goalMet ? 'goal' : 'batch'">
    <picture class="be-mascot" aria-hidden="true">
      <source :srcset="celebratingAvif" type="image/avif">
      <img :src="celebratingWebp" alt="" width="128" height="128" decoding="async">
    </picture>

    <h1 class="mt-2 text-display text-fg-strong" tabindex="-1" data-celebration-title>{{ title }}</h1>
    <p class="mt-1 text-meta text-fg-muted">{{ subtitle }}</p>

    <UiTag v-if="goalMet" class="be-chip mt-3" tone="goal" :icon="Check" size="lg" data-testid="batch-goal-chip">Meta de hoje feita</UiTag>
    <UiTag v-else-if="streak?.extendedNow && streak.current > 0" class="be-chip mt-3" tone="streak" :icon="Flame" size="lg" data-testid="batch-streak-chip">
      Sua sequência subiu para {{ streak.current }} {{ streak.current === 1 ? 'dia' : 'dias' }}
    </UiTag>

    <UiArc class="be-arc" :got="summary.remembered" :of="summary.size" :animate="!reduced">
      <UiNumber :value="shown" :unit="`de ${summary.size}`" size="xl" aria-hidden="true" />
      <span class="sr-only" data-testid="batch-remembered">Você lembrou {{ summary.remembered }} de {{ summary.size }}</span>
    </UiArc>
    <p class="mt-1 max-w-md text-body text-fg" data-testid="batch-lead">{{ lead }}</p>

    <div class="mt-5 grid w-full grid-cols-2 gap-2.5 text-left" data-testid="batch-stats">
      <UiMetricTile
        class="be-met"
        :icon="Flame"
        tone="streak"
        :value="streak?.current ?? '–'"
        :unit="streak ? (streak.current === 1 ? 'dia' : 'dias') : undefined"
        :label="streak?.record ? 'Sequência, seu recorde' : 'Sequência'"
        data-testid="batch-streak"
      />
      <UiMetricTile
        v-if="goal"
        class="be-met"
        :icon="Check"
        tone="goal"
        :value="goal.done_batches"
        :unit="`de ${goal.target_batches}`"
        :label="goal.target_batches === 1 ? 'Lote da meta de hoje' : 'Lotes da meta de hoje'"
        data-testid="batch-goal"
      />
      <UiMetricTile v-else class="be-met" :icon="Clock" tone="action" :value="summary.minutes" unit="min" label="De foco" />
    </div>
    <p v-if="statsLoading && !goal" class="sr-only" role="status">Atualizando a meta…</p>

    <div class="mt-6 flex w-full flex-col gap-1.5">
      <UiButton variant="primary" size="lg" block :aria-keyshortcuts="'Enter'" data-testid="batch-next" @click="$emit('next')">
        Próximo lote · {{ nextCount }} {{ nextCount === 1 ? 'card' : 'cards' }}
      </UiButton>
      <UiButton variant="ghost" block :to="backTo" :aria-keyshortcuts="'Escape'" data-testid="batch-stop" @click="$emit('stop')">{{ backLabel }}</UiButton>
      <UiButton v-if="errorsTo" variant="ghost" block :to="errorsTo" data-testid="batch-errors">
        Reforçar {{ summary.errorIds.length === 1 ? 'o 1 que errei' : `os ${summary.errorIds.length} que errei` }}
      </UiButton>
    </div>

    <p v-if="summary.weak && weakTo" class="mt-4 w-full text-left text-meta text-fg-muted" data-testid="batch-weak">
      Onde você mais errou: <span class="font-semibold text-fg-strong">{{ summary.weak.name }}</span> ·
      <UiLink :to="weakTo">{{ language ? 'Reforçar estes erros' : 'treinar com 10 questões' }} →</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// End of a batch, E2 (prd-visual-e2 RF-2.7, ADR-035 §5-§6): the dolphin celebrating (still image, the rare moment),
// "Bom trabalho, Ana!", the streak chip when it went up now (or "Meta de hoje feita" when the goal was met), the arc
// with "18 de 20" in Fraunces, how many only come back in a week or more (memory, not points), the streak and the
// goal of the day in two metric tiles, then "Próximo lote · N cards" (the only primary, clickable from the first
// frame: it never animates), the way out and "Reforçar os N que errei". One gesture: the dolphin leads (520 ms), the
// arc draws from 120 ms (800 ms) with the number counting along, the tiles enter at 320/380 ms and the chip at 760 ms.
// prefers-reduced-motion: opacity only (160 ms), the arc and the number ready.
import { Check, Clock, Flame } from 'lucide-vue-next'
import celebratingAvif from '~/assets/mascots/mascot-baigi-celebrating.avif'
import celebratingWebp from '~/assets/mascots/mascot-baigi-celebrating.webp'
import type { BatchSummary } from '~/composables/useReviewBatches'

export interface GoalInfo { batch_size: number; target_batches: number; done_batches: number; met: boolean }
/** `rest`: the weekly rest of the streak (/stats.streak_rest_available; null on older API builds) */
export interface StreakInfo { current: number; record: boolean; extendedNow: boolean; rest?: boolean | null }

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
  /** First name for the title ("Bom trabalho, Ana!") */
  name?: string | null
}>()
defineEmits<{ (e: 'next'): void; (e: 'stop'): void }>()

const title = computed(() => {
  if (props.goalMet) return props.name ? `Meta feita, ${props.name}!` : 'Meta de hoje feita!'
  return props.name ? `Bom trabalho, ${props.name}!` : 'Bom trabalho!'
})
const subtitle = computed(() => `Lote ${props.index} concluído`)
const lead = computed(() => {
  const far = props.summary.far
  if (far === 0) return 'O resto entra amanhã sem virar atraso: pode parar aqui se quiser.'
  return far === 1 ? '1 card só volta daqui a uma semana ou mais.' : `${far} cards só voltam daqui a uma semana ou mais.`
})
const errorsTo = computed(() => {
  const ids = props.summary.errorIds
  return ids.length ? `/revisar?scope=cards&card_ids=${ids.slice(0, 100).join(',')}` : null
})
const weakTo = computed(() => {
  const w = props.summary.weak
  if (!w || props.language) return null
  return `/simulados?topic_id=${w.id}&count=10`
})

// The number counts with the arc (800 ms from 120 ms, ease-out); reduced motion: the final value at once
const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const shown = ref(reduced ? props.summary.remembered : 0)
let raf = 0
onMounted(() => {
  void nextTick(() => document.querySelector<HTMLElement>('[data-testid=review-batch-end] [data-celebration-title]')?.focus())
  if (reduced) return
  const target = props.summary.remembered
  const start = performance.now() + 120
  const step = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - start) / 800))
    shown.value = Math.round(target * (1 - (1 - t) ** 3))
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.be-mascot img { display: block; width: 104px; height: 104px; object-fit: contain; }
.be-arc { margin-top: 18px; }
@media (min-width: 1024px) {
  .be-mascot img { width: 128px; height: 128px; }
  .be-arc { margin-top: 28px; margin-bottom: 10px; transform: scale(1.15); }
}
@media (prefers-reduced-motion: no-preference) {
  .be-mascot { animation: be-rise 520ms var(--ease-out) both; }
  .be-chip { animation: be-pop 360ms var(--ease-out) 760ms both; }
  .be-met { animation: be-up 380ms var(--ease-out) 320ms both; }
  .be-met + .be-met { animation-delay: 380ms; }
}
@media (prefers-reduced-motion: reduce) {
  .be-mascot, .be-chip, .be-met { animation: be-fade 160ms linear both; }
}
@keyframes be-rise { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes be-pop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: none; } }
@keyframes be-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes be-fade { from { opacity: 0; } to { opacity: 1; } }
</style>
