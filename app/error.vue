<template>
  <LazyUiErrorScreen :error="error" />
</template>

<script setup lang="ts">
// Nuxt imports this file statically from the entry: the screen itself comes lazily, so nobody pays for it
// until something goes wrong (prd-4g-conta-onboarding-v3 §9, ≤ 3 KB).
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>
