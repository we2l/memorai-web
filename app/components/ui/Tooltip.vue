<template>
  <div class="relative group/tooltip">
    <slot />
    <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-surface-secondary border border-base shadow-lg text-micro text-base-muted opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center leading-snug">
      {{ text }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ text: string }>()
</script>
