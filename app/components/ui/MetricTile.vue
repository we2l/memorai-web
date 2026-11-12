<template>
  <div class="flex items-start gap-3" :data-tone="tone">
    <UiIconTile :icon="icon" :tone="tone" size="md" />
    <div class="min-w-0">
      <p class="leading-none"><UiNumber :value="value" :unit="unit" size="m" /></p>
      <p class="mt-1.5 line-clamp-2 text-meta text-fg-muted">{{ label }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Metric (prd-visual-e2 RF-1.3; A2, ADR-037): loose, without a box or border — the colored icon tile beside the
// number in Fraunces (num-m, black) with the label under it; the top of the tile meets the top of the number, and
// the label wraps to 2 lines at most. The label carries the meaning; the color only identifies (ADR-035 §1).
import type { Component } from 'vue'
import type { IconTileTone } from './IconTile.vue'

defineProps<{
  icon: Component
  tone: IconTileTone
  value: string | number
  unit?: string
  label: string
}>()
</script>
