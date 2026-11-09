<template>
  <UiSheet v-if="!docked" :model-value="why.open.value" title="Por que a resposta é essa?" @update:model-value="(v: boolean) => !v && why.close()">
    <ReviewWhyBody :why="why" @ask-more="$emit('ask-more')" />
  </UiSheet>
  <section v-else class="why-panel rounded-hero bg-raised p-5.5 shadow-2" aria-labelledby="review-why-title" data-testid="review-why-panel">
    <div class="mb-3 flex items-start gap-3">
      <h2 id="review-why-title" class="min-w-0 flex-1 text-section text-fg-strong">Por que a resposta é essa?</h2>
      <UiIconButton :icon="X" label="Fechar a explicação" size="sm" class="-mr-2" @click="why.close()" />
    </div>
    <ReviewWhyBody :why="why" @ask-more="$emit('ask-more')" />
  </section>
</template>

<script setup lang="ts">
// "Por quê?" of the review (prd-visual-e2 RF-2.5): a sheet on the phone (UiSheet: Esc, focus trap, the drawer curve)
// and the right column of the review on the desktop (≥ 1024 px), in place of the excerpt of the material. The body
// (loading, error, the explanation, "Para lembrar", sources and "Perguntar mais") is ReviewWhyBody.
import { X } from 'lucide-vue-next'
import type { ReviewWhy } from '~/composables/useReviewWhy'

defineProps<{ why: ReviewWhy; docked: boolean }>()
defineEmits<{ (e: 'ask-more'): void }>()
</script>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .why-panel { animation: why-in var(--dur-base) var(--ease-out) both; }
}
@keyframes why-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
</style>
