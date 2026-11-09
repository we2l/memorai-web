<template>
  <div class="flex items-center gap-2">
    <div
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="clamped"
      :aria-valuetext="valueText"
      class="flex flex-1"
      :class="[segments ? 'gap-1' : 'overflow-hidden rounded-full bg-progress-track', HEIGHT[size]]"
    >
      <template v-if="segments">
        <span
          v-for="i in segments"
          :key="i"
          class="flex-1 overflow-hidden rounded-full bg-progress-track"
        >
          <span
            v-if="segmentFill(i)"
            class="block h-full rounded-full transition-all duration-respond ease-calm"
            :class="fill"
            :style="segmentFill(i) < 100 ? { width: `${segmentFill(i)}%` } : undefined"
          />
        </span>
      </template>
      <span
        v-else
        class="block h-full rounded-full transition-all duration-respond ease-calm"
        :class="fill"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <span v-if="showValue" class="shrink-0 text-meta tabular-nums text-fg" aria-hidden="true">{{ valueText }}</span>
  </div>
</template>

<script setup lang="ts">
// Progress bar (raio-X §D). Mastery is purple (`action`) for every subject; `neutral` is the secondary
// bar (questions accuracy); `celebrate` is the goal of the day. Yellow alone is below 3:1: a celebrate
// bar always has text near it (`showValue` or the caller's own text). `segments` draws the
// "1 de 3 lotes" track of Hoje.
const props = withDefaults(defineProps<{
  value: number
  max?: number
  /** Accessible name ("Domínio de Português") */
  label: string
  tone?: 'action' | 'neutral' | 'celebrate'
  /** sm: 5 px; md: 8 px */
  size?: 'sm' | 'md'
  /** Number of segments (lots of the day); value counts filled segments, a fraction fills one partly */
  segments?: number
  /** Text read and shown with the bar; default "41%" or "1 de 3" with segments */
  valueText?: string
  showValue?: boolean
  /** The subject's own tone (1–8, subjectTone): the thin bar of a matéria in its color (ADR-035 §1) */
  subject?: number
}>(), { max: 100, tone: 'action', size: 'sm', segments: undefined, valueText: undefined, subject: undefined })

const HEIGHT = { sm: 'h-1.25', md: 'h-2' }
const FILL = { action: 'bg-action', neutral: 'bg-progress-neutral', celebrate: 'bg-metric-goal' }
// Full class names: Tailwind only generates what it finds written
const SUBJECT = ['bg-subject-1', 'bg-subject-2', 'bg-subject-3', 'bg-subject-4', 'bg-subject-5', 'bg-subject-6', 'bg-subject-7', 'bg-subject-8']
const fill = computed(() => (props.subject ? SUBJECT[(props.subject - 1) % 8] : FILL[props.tone]))

const clamped = computed(() => Math.min(Math.max(props.value, 0), props.max))
const percent = computed(() => (props.max > 0 ? Math.round((clamped.value / props.max) * 100) : 0))
/** Filled share of segment i (0–100): whole segments, and the current one partly (the batch under way). */
function segmentFill(i: number): number {
  if (!props.segments) return 0
  const filled = (clamped.value / props.max) * props.segments
  return Math.round(Math.min(1, Math.max(0, filled - (i - 1))) * 100)
}
const valueText = computed(() => props.valueText
  ?? (props.segments ? `${clamped.value} de ${props.max}` : `${percent.value}%`))
</script>
