<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    :class="[BOX[size], MODES[mode].tone]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <component :is="MODES[mode].icon" :class="ICON[size]" stroke-width="2.2" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
// Practice mode icon (ADR-035 §1, E2): the mode color on the icon and its own tinted tile, always small.
// Revisar = action purple, Questões = amber, Ouvir = petrol (the same tiles as UiIconTile).
import { CircleHelp, Headphones, Layers } from 'lucide-vue-next'

export type PracticeMode = 'review' | 'quiz' | 'listen'

withDefaults(defineProps<{
  mode: PracticeMode
  /** sm 30 px · md 36 px · lg 40 px */
  size?: 'sm' | 'md' | 'lg'
  /** Only when the icon stands alone (no mode name beside it) */
  label?: string
}>(), { size: 'md', label: undefined })

const MODES = {
  review: { icon: Layers, tone: 'bg-action-subtle text-action-fg' },
  quiz: { icon: CircleHelp, tone: 'bg-quiz-subtle text-quiz' },
  listen: { icon: Headphones, tone: 'bg-listen-subtle text-listen' },
}
const BOX = { sm: 'size-7.5 rounded-row', md: 'size-9 rounded-control', lg: 'size-10 rounded-control' }
const ICON = { sm: 'size-3.5', md: 'size-4.5', lg: 'size-5' }
</script>
