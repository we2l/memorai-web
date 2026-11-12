<template>
  <div data-testid="readiness-score">
    <p class="text-label font-semibold text-fg-muted">Prontidão para a prova</p>
    <p class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <UiNumber :value="readiness.score ?? 0" unit="de 100" size="l" />
      <UiTag v-if="readiness.band" size="sm" :tone="bandTone" data-testid="readiness-band">{{ readiness.band.label }}</UiTag>
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
// A2 (prd-visual-a2 RF-2.5): the band is a small tag on the baseline of the number; green only once it is good
const bandTone = computed(() => (props.readiness.band?.key === 'well_prepared' || props.readiness.band?.key === 'ready' ? 'success' : 'neutral'))
</script>
