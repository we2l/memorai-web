<template>
  <aside class="flex flex-col gap-4" aria-label="Apoio da revisão" data-testid="review-side">
    <!-- After the answer: the excerpt of the material the card came from (RF-B2) -->
    <UiSection v-if="flipped && excerpt" title="Do seu material" :level="2" data-testid="review-side-excerpt">
      <p class="text-meta text-fg-muted">{{ originText }}</p>
      <blockquote class="mt-2 text-body text-fg-strong">“{{ excerpt }}”</blockquote>
      <UiLink v-if="link" :to="link" class="mt-3 inline-block" @click="$emit('open-origin')">{{ origin?.kind === 'document' ? 'Abrir no PDF' : 'Abrir a nota' }} ›</UiLink>
    </UiSection>

    <!-- Before the answer: where the batch stands, and the keys -->
    <UiSection v-else-if="summary" title="Neste lote" :level="2" data-testid="review-side-batch">
      <dl class="grid grid-cols-2 gap-2.5">
        <div class="rounded-tile bg-soft p-3.5">
          <dt class="text-meta text-fg-muted">Lembrados</dt>
          <dd class="mt-1"><UiNumber :value="summary.remembered" :unit="`de ${summary.size}`" size="s" /></dd>
        </div>
        <div class="rounded-tile bg-soft p-3.5">
          <dt class="text-meta text-fg-muted">Voltam ainda hoje</dt>
          <dd class="mt-1"><UiNumber :value="Math.max(0, summary.size - summary.inDay)" size="s" /></dd>
        </div>
      </dl>
    </UiSection>

    <div class="flex flex-wrap gap-x-4 gap-y-2 text-label text-fg-muted" data-testid="review-side-keys">
      <span v-for="k in keys" :key="k.key"><kbd class="mr-1 rounded-tag bg-soft px-1.5 font-sans font-semibold text-fg-strong shadow-0">{{ k.key }}</kbd>{{ k.label }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
// The right column of the review on the desktop (prd-visual-e2 RF-2.6, ≥ 1024 px; the page swaps it for the "Por
// quê?" when that is open). Before the answer: "Neste lote" (remembered of the batch so far and how many come back
// today) and the keys. After it: "Do seu material", the excerpt of the note or PDF part that best matches the back
// (origin.excerpt of GET /review/session), with the link to the material. The phone keeps "Abrir o trecho".
import type { SessionCardOrigin } from '~/types'
import type { BatchSummary } from '~/composables/useReviewBatches'
import { documentTitle } from '~/utils/cardState'
import { reviewOriginLink } from '~/utils/reviewOrigin'

const props = defineProps<{
  flipped: boolean
  origin?: SessionCardOrigin | null
  topicId?: string | null
  backTo: string
  summary: BatchSummary | null
  keys: { key: string; label: string }[]
}>()
defineEmits<{ (e: 'open-origin'): void }>()

const excerpt = computed(() => props.origin?.excerpt ?? null)
const link = computed(() => reviewOriginLink(props.origin, props.topicId, props.backTo))
const originText = computed(() => {
  const o = props.origin
  if (!o) return ''
  if (o.kind === 'document') return `${documentTitle(o.document_name)}${o.page ? `, p. ${o.page}` : ''}`
  return o.title
})
</script>
