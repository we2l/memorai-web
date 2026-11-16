<template>
  <div class="ec-panel" data-testid="entry-card">
    <p class="ec-meta">{{ ENTRY_CARD.source }}</p>
    <p class="ec-flash">{{ ENTRY_CARD.front }}</p>
    <!-- Announced when it shows up: the answer, then the feedback band -->
    <div aria-live="polite">
      <div v-if="flipped" class="ec-answer" data-testid="entry-answer">
        <p class="ec-answer-text">{{ ENTRY_CARD.back }}</p>
        <p class="ec-meta">{{ ENTRY_CARD.cite }}</p>
      </div>
    </div>
    <div v-if="rated" class="ec-fb" :class="rated === 'remembered' ? 'ec-fb-ok' : 'ec-fb-again'" role="status" data-testid="entry-feedback">
      <img :src="rated === 'remembered' ? '/mascote/comemorando.svg' : '/mascote/pensando.svg'" :width="rated === 'remembered' ? 265 : 280" :height="rated === 'remembered' ? 372 : 377" alt="" decoding="async">
      <p><b>{{ feedback!.title }}</b>{{ feedback!.text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// The one card of step 1 (prd-entrada-comecar RF-F12): the front, the answer after "Mostrar resposta" and the band
// with the real interval after Lembrei / Não lembrei (utils/entrada cardFeedback, RN-2). The buttons live in the bar of
// the tour; nothing is saved.
import { ENTRY_CARD, cardFeedback, type EntryRating } from '~/utils/entrada'

const props = defineProps<{ flipped: boolean, rated: EntryRating | null }>()
const feedback = computed(() => (props.rated ? cardFeedback(props.rated) : null))
</script>
