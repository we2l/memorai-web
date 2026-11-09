<template>
  <div class="relative mx-auto h-37.5 w-65" data-testid="ui-arc" :data-got="got" :data-of="of">
    <svg data-part="svg" class="h-37.5 w-65 overflow-visible" viewBox="0 0 260 150" aria-hidden="true">
      <path data-part="track" :d="PATH" fill="none" stroke-width="16" stroke-linecap="round" />
      <path
        v-if="ratio > 0"
        data-part="prog"
        :data-draw="animate || undefined"
        :d="PATH"
        fill="none"
        stroke-width="16"
        stroke-linecap="round"
        :stroke-dasharray="LENGTH"
        :stroke-dashoffset="LENGTH * (1 - ratio)"
      />
    </svg>
    <div class="absolute inset-x-0 bottom-0.5 text-center"><slot /></div>
  </div>
</template>

<script setup lang="ts">
// Arc (prd-visual-e2 RF-1.3): the half circle of the end of a batch, 260 × 150, `got` of `of`. It draws in 800 ms
// from 120 ms (ADR-035 §6) when `animate`; with prefers-reduced-motion it shows ready. The number goes in the slot
// (UiNumber num-xl at 62 px); the arc itself is decorative.
const props = withDefaults(defineProps<{ got: number; of: number; animate?: boolean }>(), { animate: false })

// Half circle of radius 112 centered at (130, 130)
const PATH = 'M 18 130 A 112 112 0 0 1 242 130'
const LENGTH = Math.PI * 112
const ratio = computed(() => (props.of > 0 ? Math.min(1, Math.max(0, props.got / props.of)) : 0))
</script>

<style scoped>
[data-part="svg"] { filter: var(--glow); }
/* The number inside the arc is num-xl at 62 px (ADR-035 §2) */
:slotted(.num-xl) { font-size: 3.875rem; }
[data-part="track"] { stroke: var(--action-subtle); }
[data-part="prog"] { stroke: var(--action); }
@media (prefers-reduced-motion: no-preference) {
  [data-draw] { animation: arc-draw 800ms var(--ease-out) 120ms both; }
}
@keyframes arc-draw {
  from { stroke-dashoffset: 351.86px; }
}
</style>
