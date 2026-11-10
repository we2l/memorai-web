<template>
  <div data-testid="readiness-score">
    <p class="text-label font-semibold text-fg-muted">Prontidão para a prova</p>
    <p class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <UiNumber :value="readiness.score ?? 0" unit="de 100" size="l" />
      <span class="font-semibold text-fg-strong" data-testid="readiness-band">{{ readiness.band?.label }}</span>
    </p>
    <p class="mt-1.5 text-meta text-fg" data-testid="readiness-parts">{{ parts }}</p>
  </div>
</template>

<script setup lang="ts">
// The number of the readiness (prd-prontidao-prova RF-F2, RF-F3): "Prontidão para a prova", the number in black on the
// Fraunces (ADR-035 §2), the band in words and the parts always in sight, so the number never shows alone (DD5).
// Shared by the lilac card of Hoje and of Progresso; only rendered with a score.
import type { ExamReadiness } from '~/types'
import { readinessPartsText } from '~/utils/readiness'

const props = defineProps<{ readiness: ExamReadiness }>()

const parts = computed(() => readinessPartsText(props.readiness.parts))
</script>
