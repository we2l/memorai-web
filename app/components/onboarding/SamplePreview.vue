<template>
  <aside class="flex flex-col items-center gap-4 pt-4" aria-label="Prévia de um card" data-testid="sample-preview">
    <UiBaigiMascot :size="112" state="idle" />
    <UiSection as="div" class="w-full">
      <p class="font-semibold text-fg-strong">{{ preview.front }}</p>
      <p class="mt-3 border-t border-line pt-3 text-body text-fg">{{ preview.back }}</p>
      <p class="mt-3 text-label text-fg-muted">Um card do exemplo: {{ preview.title }}</p>
    </UiSection>
    <p class="max-w-sm text-center text-meta text-fg-muted">Depois da primeira revisão, o Baigi monta o seu plano do dia.</p>
  </aside>
</template>

<script setup lang="ts">
// Desktop side of the content step (prd-4g-conta-onboarding-v3 RF-F5): the mascot and a real card of the sample.
import { samplePreview } from '~/utils/onboardingSamples'

const props = defineProps<{ mode: string }>()
const preview = computed(() => samplePreview(props.mode))
</script>
