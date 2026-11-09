<template>
  <div class="rounded-tile bg-soft p-3.5" :data-tone="tone">
    <UiIconTile :icon="icon" :tone="tone" size="sm" />
    <UiNumber class="mt-3 block" :value="value" :unit="unit" size="s" />
    <p class="mt-1 text-meta text-fg-muted">{{ label }}</p>
  </div>
</template>

<script setup lang="ts">
// Metric tile (prd-visual-e2 RF-1.3): the colored icon of the metric, the number in num-s (Fraunces, black) and
// the label under it. The label carries the meaning; the color only identifies (ADR-035 §1).
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
