<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <UiLink v-if="back" :to="back.to" variant="muted" standalone class="-ml-1 px-1">
        <ChevronLeft class="size-4" aria-hidden="true" />
        {{ back.label }}
      </UiLink>
      <div class="flex items-center gap-3">
        <slot name="leading" />
        <h1 class="text-page-title text-fg-strong">{{ title }}</h1>
      </div>
      <p v-if="meta || $slots.meta" class="mt-1 text-body text-fg-muted">
        <slot name="meta">{{ meta }}</slot>
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
// Page header (raio-X §D): the only <h1> of the screen, 24 px on the phone and 32 px from sm up.
// `actions` holds the screen's single primary action (UiButton warns in dev when there are more).
import { ChevronLeft } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  title: string
  meta?: string
  /** "‹ Cadernos" */
  back?: { to: RouteLocationRaw; label: string }
}>()
</script>
