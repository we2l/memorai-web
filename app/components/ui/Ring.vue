<template>
  <div class="relative inline-grid shrink-0 place-items-center" :style="{ width: `${size}px`, height: `${size}px` }" data-testid="ui-ring" :data-value="clamped">
    <svg data-part="svg" class="absolute inset-0 size-full" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle data-part="track" :cx="c" :cy="c" :r="r" fill="none" :stroke-width="stroke" />
      <circle
        v-if="clamped > 0"
        data-part="prog"
        :data-draw="drawing || undefined"
        :cx="c"
        :cy="c"
        :r="r"
        fill="none"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="length"
        :stroke-dashoffset="offset"
        :style="{ '--len': `${length}px` }"
      />
    </svg>
    <span class="relative"><slot /></span>
  </div>
</template>

<script setup lang="ts">
// Ring (prd-visual-e2 RF-1.3, ADR-035 §6): the goal of the day. SVG, value 0..1, the purple on a lilac track; in
// the dark it glows (--glow). `animate` draws it once in 900 ms (the caller decides when: once a day on Hoje);
// with prefers-reduced-motion it shows ready. Decorative: the caller gives the text ("1 de 3 lotes").
const props = withDefaults(defineProps<{
  value: number
  size?: number
  stroke?: number
  animate?: boolean
}>(), { size: 64, stroke: 7, animate: false })

const clamped = computed(() => Math.min(1, Math.max(0, props.value)))
const c = computed(() => props.size / 2)
const r = computed(() => (props.size - props.stroke) / 2)
const length = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => length.value * (1 - clamped.value))
const drawing = computed(() => props.animate)
</script>

<style scoped>
[data-part="svg"] { transform: rotate(-90deg); filter: var(--glow); }
[data-part="track"] { stroke: var(--action-subtle); }
[data-part="prog"] { stroke: var(--action); }
@media (prefers-reduced-motion: no-preference) {
  [data-draw] { animation: ring-draw 900ms var(--ease-out) 120ms both; }
}
@keyframes ring-draw {
  from { stroke-dashoffset: var(--len); }
}
</style>
