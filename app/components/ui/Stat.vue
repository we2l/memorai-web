<template>
  <div class="min-w-0">
    <p class="flex items-baseline gap-1.5 text-fg-strong">
      <component :is="TONE_ICON[tone]" v-if="tone !== 'default'" class="size-5 shrink-0 self-center fill-current" :class="tone === 'streak' ? 'text-streak' : 'text-celebrate'" aria-hidden="true" />
      <span class="tabular-nums" :class="size === 'lg' ? 'text-stat' : 'text-page-title-sm sm:text-page-title'">{{ value }}</span>
      <span v-if="unit" class="text-body text-fg-muted">{{ unit }}</span>
    </p>
    <p class="text-meta" :class="TONE_TEXT[tone]">{{ label }}</p>
    <p v-if="hint" class="mt-0.5 text-label text-fg-muted">{{ hint }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
// Number with its label (raio-X §D). The number is always --fg-strong (v4: no colored numbers);
// `tone` is only for achievements: a small yellow/orange shape plus the label in the -fg color
// (ADR-027 §4: the shape never informs alone). The default slot takes a UiProgressBar under it.
import { Flame, Trophy } from 'lucide-vue-next'

type Tone = 'default' | 'celebrate' | 'streak'

withDefaults(defineProps<{
  value: string | number
  label: string
  unit?: string
  hint?: string
  tone?: Tone
  /** md: 24/32 px (KPIs); lg: 48 px (the number of the screen) */
  size?: 'md' | 'lg'
}>(), { unit: undefined, hint: undefined, tone: 'default', size: 'md' })

const TONE_ICON = { default: null, celebrate: Trophy, streak: Flame }
const TONE_TEXT: Record<Tone, string> = {
  default: 'text-fg-muted',
  celebrate: 'font-semibold text-celebrate-fg',
  streak: 'font-semibold text-streak-fg',
}
</script>
