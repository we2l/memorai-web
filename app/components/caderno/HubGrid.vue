<template>
  <div class="grid items-start gap-5 lg:gap-6" :class="$slots.side && 'lg:grid-cols-[minmax(0,1fr)_25rem]'">
    <aside v-if="$slots.side" class="flex flex-col gap-5 lg:sticky lg:top-[calc(var(--topnav-h)+12px)] lg:col-start-2 lg:row-start-1" :aria-label="sideLabel">
      <slot name="side" />
    </aside>
    <div class="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// The two columns of the hub, E2 (prd-visual-e2 RF-4.2, ADR-035 §9): the side (numbers, next step, exam) comes first
// on the phone and goes to the right from 1024 px, sticky under the TopNav; the main column is fluid. Utilities only: CSS of
// an index.vue page lands in an index.*.css, the name the landing owns (out of the precache).
defineProps<{ sideLabel: string }>()
</script>

