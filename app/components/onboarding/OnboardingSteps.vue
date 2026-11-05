<template>
  <UiProgressBar
    :value="step"
    :max="3"
    :segments="3"
    size="md"
    :label="`Passo ${step} de 3`"
    :value-text="`Passo ${step} de 3`"
    show-value
    data-testid="onboarding-steps"
  />
</template>

<script setup lang="ts">
// "Passo N de 3" with three segments (prd-4g-conta-onboarding-v3 RF-F5).
defineProps<{ step: 1 | 2 | 3 }>()
</script>
