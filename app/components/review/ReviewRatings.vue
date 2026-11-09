<template>
  <div role="group" aria-label="Como foi" class="grid gap-2.5" :class="mode === 'two' ? 'grid-cols-2' : 'grid-cols-4'" data-testid="review-ratings" :data-mode="mode">
    <UiButton
      v-for="r in ratings"
      :key="r.value"
      size="rating"
      :variant="r.primary ? 'primary' : 'secondary'"
      :class="mode === 'four' && 'text-body-sm'"
      :aria-keyshortcuts="r.keys"
      :aria-label="`${r.label}${intervals[r.key] ? `, volta ${intervalText(r.key)}` : ''} (${r.key_label})`"
      :data-variant="r.primary ? 'primary' : 'secondary'"
      :data-testid="`rate-${r.value}`"
      @click="$emit('rate', r.value)"
    >
      {{ r.label }}
      <template #hint>{{ intervalText(r.key) }}</template>
    </UiButton>
  </div>
</template>

<script setup lang="ts">
// The ratings of the review. Two (prd-revisao-v5-fase-a RF-F1, the default): "Não lembrei" (neutral, never red) and
// "Lembrei" (the screen's single primary), Again = 1 and Good = 3 in the FSRS, keys 1 and 2. Four (prd-4d-revisao-v3
// RF-F4, the option): 1 De novo · 2 Difícil · 3 Bom · 4 Fácil, the Anki convention, "Bom" primary. The interval under
// each (UiButton size="rating": 62 px, radius 18; prd-visual-e2 RF-2.3). The keys are in the side column and in the
// hint line, not on the buttons. `again` can say where the card goes instead ("no fim do lote" in the visitor's lote).
import type { ReviewButtonsMode } from '~/utils/reviewButtons'
import { returnText } from '~/utils/intervalLabel'

type Key = 'again' | 'hard' | 'good' | 'easy'

const props = withDefaults(defineProps<{
  intervals: Record<Key, string>
  mode?: ReviewButtonsMode
  /** Replaces the interval under "Não lembrei" (the visitor: "no fim do lote") */
  againText?: string
}>(), { mode: 'four', againText: undefined })
defineEmits<{ (e: 'rate', rating: 1 | 2 | 3 | 4): void }>()

interface Rating { value: 1 | 2 | 3 | 4; key: Key; label: string; primary: boolean; keys: string; key_label: string }

const FOUR: Rating[] = [
  { value: 1, key: 'again', label: 'De novo', primary: false, keys: '1', key_label: '1' },
  { value: 2, key: 'hard', label: 'Difícil', primary: false, keys: '2', key_label: '2' },
  { value: 3, key: 'good', label: 'Bom', primary: true, keys: '3', key_label: '3' },
  { value: 4, key: 'easy', label: 'Fácil', primary: false, keys: '4', key_label: '4' },
]
const TWO: Rating[] = [
  { value: 1, key: 'again', label: 'Não lembrei', primary: false, keys: '1 ArrowLeft', key_label: '1' },
  { value: 3, key: 'good', label: 'Lembrei', primary: true, keys: '2 ArrowRight Space', key_label: '2' },
]

const ratings = computed(() => (props.mode === 'two' ? TWO : FOUR))

// The API's labels in Portuguese ("2d" → "em 2 dias"), the same reading as the feedback and the agenda
function intervalText(key: Key): string {
  if (key === 'again' && props.againText) return props.againText
  return props.intervals[key] ? returnText(props.intervals[key]) : '·'
}
</script>
