<template>
  <div role="status" class="flex flex-col items-center text-center">
    <div class="relative mb-3" aria-hidden="true">
      <UiBaigiMascot v-if="mascot" :size="96" state="celebrating" class="motion-safe:animate-celebrate-pop" />
      <span v-else class="flex h-16 w-16 items-center justify-center rounded-full bg-soft motion-safe:animate-celebrate-pop">
        <component :is="KINDS[kind].icon" class="h-8 w-8 fill-current" :class="KINDS[kind].shape" />
      </span>
      <template v-if="!reduced">
        <span
          v-for="(p, i) in particles"
          :key="i"
          class="absolute left-1/2 top-1/2 size-2 rounded-full opacity-0 animate-celebrate-burst"
          :class="p.color"
          :style="{ '--burst-x': `${p.x}px`, '--burst-y': `${p.y}px` }"
        />
      </template>
    </div>
    <component :is="level ? `h${level}` : 'p'" class="text-fg-strong outline-none" :class="level ? 'text-page-title' : 'text-section'" :tabindex="level ? -1 : undefined" data-celebration-title>{{ title }}</component>
    <p class="mt-1 flex items-center gap-1.5 text-meta font-semibold" :class="KINDS[kind].text">
      <component :is="KINDS[kind].icon" class="size-4 fill-current" :class="KINDS[kind].shape" aria-hidden="true" />
      {{ subtitle ?? KINDS[kind].label }}
    </p>
    <div v-if="stats?.length" class="mt-5 flex flex-wrap justify-center gap-6">
      <UiStat v-for="s in stats" :key="s.label" :value="s.value" :label="s.label" />
    </div>
    <div v-if="$slots.default" class="mt-6 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Achievement moment (raio-X §D, tasks 12.6): end of a batch, goal of the day, streak, milestone. Mascot
// (or the kind's shape) pops and a small burst of dots in the achievement colors leaves it, in at most
// --motion-celebrate (700 ms); with prefers-reduced-motion there is no burst and no movement. The yellow/
// orange shape never informs alone: the kind is also written in its -fg color (ADR-027 §4). Replaces
// Confetti; the screens adopt it in Phase 4d.
import { Flame, Sparkles, Star, Trophy } from 'lucide-vue-next'

export type CelebrationKind = 'batch' | 'goal' | 'streak' | 'milestone'

const props = withDefaults(defineProps<{
  kind: CelebrationKind
  title: string
  /** Line under the title; default by kind ("Lote concluído"...) */
  subtitle?: string
  stats?: { value: string | number; label: string }[]
  mascot?: boolean
  /** The title as a heading of this level (a screen of its own: the end of a batch), focusable */
  level?: 1 | 2
}>(), { subtitle: undefined, stats: undefined, mascot: true, level: undefined })

const KINDS: Record<CelebrationKind, { label: string; icon: typeof Star; shape: string; text: string; burst: string[] }> = {
  batch: { label: 'Lote concluído', icon: Sparkles, shape: 'text-metric-goal', text: 'text-metric-goal-fg', burst: ['bg-action', 'bg-metric-goal'] },
  goal: { label: 'Meta de hoje cumprida', icon: Star, shape: 'text-metric-goal', text: 'text-metric-goal-fg', burst: ['bg-metric-goal', 'bg-action'] },
  streak: { label: 'Sequência mantida', icon: Flame, shape: 'text-metric-streak', text: 'text-metric-streak-fg', burst: ['bg-metric-streak', 'bg-metric-goal'] },
  milestone: { label: 'Marco alcançado', icon: Trophy, shape: 'text-metric-goal', text: 'text-metric-goal-fg', burst: ['bg-metric-goal', 'bg-metric-streak', 'bg-action'] },
}

const reduced = useReducedMotion()

// 12 dots evenly around the mascot, two distances: deterministic (no Math.random in render)
const particles = computed(() => {
  const colors = KINDS[props.kind].burst
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const r = i % 2 ? 64 : 80
    return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r), color: colors[i % colors.length] }
  })
})
</script>
