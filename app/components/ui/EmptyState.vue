<template>
  <div class="flex flex-col items-center px-6 py-10 text-center">
    <UiBaigiMascot v-if="mascot" :size="88" :state="mascot === true ? 'idle' : mascot" class="mb-4" />
    <component :is="`h${level}`" class="text-section text-fg-strong">{{ title }}</component>
    <p v-if="description" class="mt-1 max-w-sm text-body text-fg-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Empty state (raio-X §D, tasks 12.4): optional mascot, one sentence and one call to action (frontend-ux:
// "vazio é um convite para agir"). Replaces the 8+ hand-made empty states, each with its own sizes.
withDefaults(defineProps<{
  title: string
  description?: string
  /** true: mascot at rest; or a mascot state */
  mascot?: boolean | 'idle' | 'thinking' | 'celebrating' | 'subtle'
  level?: 2 | 3
}>(), { description: undefined, mascot: false, level: 2 })
</script>
