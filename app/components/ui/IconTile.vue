<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    :class="[TONES[tone], BOX[size]]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <component :is="icon" v-if="icon" :class="[ICON[size], tone === 'streak' && 'fill-metric-streak']" stroke-width="2.2" aria-hidden="true" />
    <slot v-else />
  </span>
</template>

<script setup lang="ts">
// Icon tile (ADR-035 §1, prd-visual-e2 RF-1.3): the only color outside the purple, always small. A metric
// (streak = flame, goal = check, accuracy = trend) or a practice mode (quiz amber, listen petrol; review is the
// action purple) on its own tinted square; neutral for the rest. The icon never informs alone: a label goes next
// to it (or `label` when it stands alone). Icons >= 3:1 on their tile (tokensContrast).
import type { Component } from 'vue'

export type IconTileTone = 'action' | 'streak' | 'goal' | 'accuracy' | 'quiz' | 'listen' | 'neutral'

withDefaults(defineProps<{
  icon?: Component
  tone?: IconTileTone
  /** sm 34 px · md 42 px · lg 52 px */
  size?: 'sm' | 'md' | 'lg'
  label?: string
}>(), { icon: undefined, tone: 'neutral', size: 'md', label: undefined })

const TONES: Record<IconTileTone, string> = {
  action: 'bg-action-subtle text-action-fg',
  streak: 'bg-metric-streak-bg text-metric-streak',
  goal: 'bg-metric-goal-bg text-metric-goal',
  accuracy: 'bg-metric-accuracy-bg text-metric-accuracy',
  quiz: 'bg-quiz-subtle text-quiz',
  listen: 'bg-listen-subtle text-listen',
  neutral: 'bg-soft text-fg-muted',
}
const BOX = { sm: 'size-8.5 rounded-row', md: 'size-10.5 rounded-icon', lg: 'size-13 rounded-icon' }
const ICON = { sm: 'size-4', md: 'size-5', lg: 'size-6' }
</script>
