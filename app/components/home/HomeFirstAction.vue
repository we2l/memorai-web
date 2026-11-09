<template>
  <UiSection data-testid="home-first-action" class="relative overflow-hidden">
    <picture class="fa-mascot" aria-hidden="true">
      <source :srcset="thinkingAvif" type="image/avif">
      <img :src="thinkingWebp" alt="" width="64" height="64" decoding="async">
    </picture>

    <UiTag tone="action" :icon="Sparkles">Seu próximo passo</UiTag>
    <h2 class="mt-3 max-w-md pr-16 text-page-title text-fg-strong">Gere os cards de {{ topic.name }} e faça a 1ª revisão hoje</h2>
    <p class="mt-2 max-w-lg text-body-sm text-fg-muted">{{ explain }}</p>

    <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <UiButton variant="primary" :icon-left="Sparkles" :to="cadernoPath(topic.id)" data-testid="home-first-action-go" @click="track">Gerar cards e revisar</UiButton>
      <span class="inline-flex items-center gap-1.5 text-meta text-fg-muted"><Clock class="size-4" aria-hidden="true" /> ≈ 5 min</span>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Hoje without cards, B5 of the roadmap (prd-visual-e2 RF-3.6): one action, "Gere os cards de {matéria com mais
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
.fa-mascot { position: absolute; top: 1rem; right: 1rem; }
.fa-mascot img { display: block; width: 64px; height: 64px; object-fit: contain; }
@media (min-width: 40rem) {
  .fa-mascot { top: 1.25rem; right: 1.5rem; }
  .fa-mascot img { width: 80px; height: 80px; }
}
</style>
