<template>
  <div class="flex flex-col gap-3" data-testid="review-why-body" :data-status="why.status.value">
    <p class="flex items-center gap-2 text-label font-semibold text-action-fg"><Sparkles class="size-4" aria-hidden="true" />Explicação do Baigi</p>

    <div v-if="why.status.value === 'loading'" aria-busy="true">
      <span class="sr-only" role="status">Escrevendo a explicação…</span>
      <UiSkeleton variant="text" :lines="3" />
    </div>

    <UiErrorState
      v-else-if="why.status.value === 'error'"
      title="Não deu para explicar agora"
      description="Verifique sua conexão e tente de novo."
      @retry="why.retry()"
    />

    <template v-else-if="why.status.value === 'ok'">
      <p v-for="(para, i) in paragraphs" :key="i" class="text-body text-fg-strong" data-testid="review-why-text">{{ para }}</p>
      <UiSection v-if="why.remember.value" variant="tile" as="div" data-testid="review-why-remember">
        <p class="text-label font-semibold text-fg-muted">Para lembrar</p>
        <p class="mt-1 text-body font-semibold text-fg-strong">{{ why.remember.value }}</p>
      </UiSection>
      <div v-if="why.sources.value.length" class="text-meta text-fg-muted" data-testid="review-why-sources">
        <p class="font-semibold">Do seu material</p>
        <ul class="mt-1">
          <li v-for="(s, i) in why.sources.value" :key="i">{{ s.label }}<template v-if="s.page">, p. {{ s.page }}</template></li>
        </ul>
      </div>
      <UiButton variant="secondary" :icon-left="MessageCircle" data-testid="review-why-more" @click="$emit('ask-more')">Perguntar mais</UiButton>
    </template>
  </div>
</template>

<script setup lang="ts">
// The body of the "Por quê?" (prd-visual-e2 RF-2.5): loading (3 lines), error with "Tentar de novo", the explanation in
// paragraphs, the "Para lembrar" tile, the sources from the card's origin and "Perguntar mais" (the tira-dúvidas in the
// same conversation). Plain text: the server's markdown bold is dropped by useReviewWhy.
import { MessageCircle, Sparkles } from 'lucide-vue-next'
import type { ReviewWhy } from '~/composables/useReviewWhy'

const props = defineProps<{ why: ReviewWhy }>()
defineEmits<{ (e: 'ask-more'): void }>()

const paragraphs = computed(() => props.why.text.value.split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean))
</script>
