<template>
  <!-- Check (green) -->
  <span v-if="value === true" class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
    <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </span>
  <!-- X (red) -->
  <span v-else-if="value === false" class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
    <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </span>
  <!-- Partial (amber) -->
  <span v-else class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-50">
    <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M12 3l9.196 16H2.804L12 3z" />
    </svg>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  value: boolean | 'partial'
}>()
</script>
