<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip font-semibold" :class="[TONES[tone], SIZES[size]]">
    <span v-if="tone === 'quiz' || tone === 'listen'" class="size-1.5 shrink-0 rounded-full" :class="tone === 'quiz' ? 'bg-quiz' : 'bg-listen'" aria-hidden="true" />
    <component :is="icon" v-if="icon" class="size-4 shrink-0" :class="ICON_TONES[tone]" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
// Tag/chip, E2 skin (prd-visual-e2 RF-1.4): a pill of 28 px (34 in the highlight, size lg), text 13 px or more.
// State tones are text on their own background (>= 4.5:1, tokensContrast). Metric tones (streak, goal) carry the
// colored icon with the -fg text (the flame of "14 dias", the check of the goal); `brand` is the subject in the
// review. Practice tones (quiz, listen) stay neutral with a small colored dot (ADR-035 §1, color only small).
import type { Component } from 'vue'

export type TagTone = 'neutral' | 'raised' | 'action' | 'brand' | 'streak' | 'goal' | 'success' | 'warning' | 'danger' | 'info' | 'quiz' | 'listen'

withDefaults(defineProps<{ tone?: TagTone; icon?: Component; size?: 'sm' | 'md' | 'lg' }>(), { tone: 'neutral', icon: undefined, size: 'md' })

/** sm (A2, ADR-037): 24 px beside a big number, on its baseline ("78 de 100 · Bem preparado"); text stays 13 px */
const SIZES = { sm: 'min-h-6 px-2 text-label', md: 'min-h-7 px-2.75 text-label', lg: 'min-h-8.5 px-3 text-body-sm' }

const TONES: Record<TagTone, string> = {
  neutral: 'bg-soft text-fg-muted',
  // A2 (ADR-037): a chip of facts on the tinted page (the hub header: exam, cards, materials, mode)
  raised: 'bg-raised text-fg shadow-1',
  action: 'bg-action-subtle text-action-fg',
  brand: 'bg-action-subtle text-action-fg',
  streak: 'bg-metric-streak-bg text-metric-streak-fg',
  goal: 'bg-metric-goal-bg text-metric-goal-fg',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
  quiz: 'bg-soft text-fg',
  listen: 'bg-soft text-fg',
}
const ICON_TONES: Partial<Record<TagTone, string>> = { raised: 'text-fg-muted', streak: 'text-metric-streak fill-metric-streak', goal: 'text-metric-goal' }
</script>
