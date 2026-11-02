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
          class="flex-1 rounded-full transition-colors duration-respond"
          :class="i <= filledSegments ? FILL[tone] : 'bg-progress-track'"
        />
      </template>
      <span
        v-else
        class="block h-full rounded-full transition-all duration-respond ease-calm"
        :class="FILL[tone]"
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
  /** Number of segments (lots of the day); value counts filled segments */
  segments?: number
  /** Text read and shown with the bar; default "41%" or "1 de 3" with segments */
  valueText?: string
  showValue?: boolean
}>(), { max: 100, tone: 'action', size: 'sm', segments: undefined, valueText: undefined })

const HEIGHT = { sm: 'h-1.25', md: 'h-2' }
const FILL = { action: 'bg-action', neutral: 'bg-progress-neutral', celebrate: 'bg-celebrate' }

const clamped = computed(() => Math.min(Math.max(props.value, 0), props.max))
const percent = computed(() => (props.max > 0 ? Math.round((clamped.value / props.max) * 100) : 0))
const filledSegments = computed(() => (props.segments ? Math.round((clamped.value / props.max) * props.segments) : 0))
const valueText = computed(() => props.valueText
  ?? (props.segments ? `${clamped.value} de ${props.max}` : `${percent.value}%`))
</script>
