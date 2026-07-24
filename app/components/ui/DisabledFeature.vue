<template>
  <div class="relative group/disabled" :class="!enabled && 'opacity-50 cursor-not-allowed'">
    <div :class="!enabled && 'pointer-events-none'" :aria-disabled="!enabled">
      <slot />
    </div>
    <span
      v-if="!enabled && tooltip"
      role="tooltip"
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-base shadow-lg text-micro text-base-muted opacity-0 group-hover/disabled:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none z-50 w-52 text-center leading-snug"
    >
      {{ tooltip }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  enabled: boolean
  tooltip?: string
}>()
</script>
