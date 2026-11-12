<template>
  <UiSection variant="primary" data-testid="home-first-action">
    <div class="fa-grid">
      <!-- The dolphin in the place of the goal ring (A2 RF-2.7); static, an empty state with an action (ADR-035 §5) -->
      <picture class="fa-mascot" aria-hidden="true">
        <source :srcset="thinkingAvif" type="image/avif">
        <img :src="thinkingWebp" alt="" width="64" height="104" decoding="async">
      </picture>
      <div class="fa-head min-w-0">
        <UiTag tone="action" :icon="Sparkles">Seu próximo passo</UiTag>
        <h2 class="fa-title mt-3 text-page-title text-fg-strong">Gere os cards de {{ topic.name }} e faça a 1ª revisão hoje</h2>
      </div>
      <div class="fa-body min-w-0">
        <p class="max-w-lg text-body-sm text-fg-muted">{{ explain }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <UiButton variant="primary" size="lg" :icon-left="Sparkles" :to="cadernoPath(topic.id)" class="max-sm:w-full" data-testid="home-first-action-go" @click="track">Gerar cards e revisar</UiButton>
          <span class="inline-flex items-center gap-1.5 text-meta text-fg-muted"><Clock class="size-4" aria-hidden="true" /> ≈ 5 min</span>
        </div>
      </div>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Hoje without cards, B5 of the roadmap (prd-visual-e2 RF-3.6; A2 RF-2.7: the primary block, the dolphin where the
// ring of the goal would be): one action, "Gere os cards de {matéria com mais
// material} e faça a 1ª revisão hoje". It opens the hub of that subject, where the next step is "Gerar cards" (the
// flow that already exists); the first steps under it become support. The dolphin is static: an empty state with an
// action (ADR-035 §5).
import { Clock, Sparkles } from 'lucide-vue-next'
import type { TopicProgress } from '~/types'
import thinkingAvif from '~/assets/mascots/mascot-baigi-thinking.avif'
import thinkingWebp from '~/assets/mascots/mascot-baigi-thinking.webp'

const props = defineProps<{ topic: TopicProgress; rootsWithMaterial: number }>()

const explain = computed(() => {
  const where = props.rootsWithMaterial > 1 ? `em ${props.rootsWithMaterial} cadernos` : 'aqui'
  return `Você já tem material ${where}. A IA escreve até 15 cards a partir dele, e o primeiro lote leva uns 5 minutos.`
})

function track() {
  useAnalytics().track('home_first_action_click', { notes: props.topic.notes_count ?? 0 })
}
</script>

<style scoped>
/* Same frame as the goal block: the art beside the title, the text and the button under both on the phone */
.fa-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "art head" "body body";
  gap: 1rem;
  align-items: center;
}
.fa-mascot { grid-area: art; display: block; }
.fa-mascot img { display: block; height: 6.5rem; width: auto; }
.fa-head { grid-area: head; }
.fa-body { grid-area: body; }
.fa-title { font-size: 1.5rem; line-height: 1.15; text-wrap: balance; }
@media (min-width: 40rem) {
  .fa-grid { grid-template-areas: "art head" "art body"; align-content: center; column-gap: 1.75rem; row-gap: 0.5rem; }
  .fa-head, .fa-body { align-self: start; }
  .fa-title { font-size: 1.75rem; }
  .fa-mascot img { height: 8rem; }
}
</style>
