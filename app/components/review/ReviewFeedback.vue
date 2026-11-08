<template>
  <div class="flex min-h-8 justify-center" data-testid="review-feedback-slot">
    <p
      v-if="feedback"
      :key="feedback.id"
      class="feedback-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-semibold"
      :class="feedback.remembered ? 'bg-success-subtle text-success' : 'bg-subtle text-fg'"
      :data-remembered="feedback.remembered"
      data-testid="review-feedback"
    >
      <component :is="feedback.remembered ? Check : RotateCcw" class="size-4 shrink-0" aria-hidden="true" />
      {{ feedback.text }}
    </p>
  </div>
</template>

<script setup lang="ts">
// The answer to each rating (prd-revisao-v5-fase-a RF-F4): a short pill with where the card goes, "Lembrei · volta em
// 2 dias" (success) or "Não lembrei · volta em 10 min" (neutral: forgetting is not punished, never red). It pops in
// within --motion-respond (200 ms) and stays until the next rating; with prefers-reduced-motion it just appears.
// The text and the icon carry it, never the color alone. The announcement goes to the page's aria-live; no toast,
// no sound (D4), and the mascot only at the end of the lote.
import { Check, RotateCcw } from 'lucide-vue-next'

export interface RatingFeedback { id: number; remembered: boolean; text: string }

defineProps<{ feedback: RatingFeedback | null }>()
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .feedback-in { animation: feedback-in var(--motion-respond) var(--ease-calm) both; }
}
@keyframes feedback-in {
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
</style>
