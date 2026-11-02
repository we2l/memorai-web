<template>
  <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-tag px-2 py-0.5 text-label font-semibold" :class="TONES[tone]">
    <span v-if="tone === 'quiz' || tone === 'listen'" class="size-1.5 shrink-0 rounded-full" :class="tone === 'quiz' ? 'bg-quiz' : 'bg-listen'" aria-hidden="true" />
    <component :is="icon" v-if="icon" class="size-3.5 shrink-0" aria-hidden="true" />
    <slot />
  </span>
</template>

<script setup lang="ts">
// Tag (raio-X §D): replaces the dead `badge*` utilities, the hand-made badges and the inside of PlanBadge.
// State tones are text on their own background (>= 4.5:1, tokensContrast). Practice tones (quiz, listen)
// stay neutral with a small colored dot: their color is below 4.5:1 as text (ADR-027 §6, color only small).
import type { Component } from 'vue'

export type TagTone = 'neutral' | 'action' | 'success' | 'warning' | 'danger' | 'info' | 'quiz' | 'listen'

withDefaults(defineProps<{ tone?: TagTone; icon?: Component }>(), { tone: 'neutral', icon: undefined })

const TONES: Record<TagTone, string> = {
  neutral: 'bg-subtle text-fg-muted',
  action: 'bg-action-subtle text-action-fg',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
  quiz: 'bg-subtle text-fg',
  listen: 'bg-subtle text-fg',
}
</script>
