<template>
  <section
    class="flex w-full flex-col gap-4 rounded-card bg-raised p-6 shadow-card sm:min-h-72 sm:p-8"
    :class="!flipped && 'select-none pointer-fine:cursor-pointer'"
    :aria-label="flipped ? 'Card com a resposta' : 'Card: Espaço ou Mostrar resposta para ver a resposta'"
    :role="flipped ? 'region' : 'button'"
    :tabindex="flipped ? -1 : 0"
    data-review-card
    data-testid="review-card"
    @click="onClick"
  >
    <p v-if="label" class="text-label font-semibold text-fg-muted">{{ label }}</p>
    <div class="card-html break-words text-section text-fg-strong" data-testid="review-front" v-html="front" />
    <div
      v-if="flipped"
      class="answer-in flex flex-col gap-4 border-t border-line pt-4"
      data-testid="review-answer"
    >
      <div class="card-html break-words text-body text-fg" v-html="back" />
      <div v-if="audio" class="w-full max-w-xs" @click.stop>
        <UiAudioPlayer :src="audio" />
      </div>
      <slot name="origin" />
    </div>
    <div v-else-if="audio" class="w-full max-w-xs" @click.stop>
      <UiAudioPlayer :src="audio" />
    </div>
  </section>
</template>

<script setup lang="ts">
// The card of the session (prd-4d-revisao-v3 RF-F3): the subject as a label, the question, and after the
// turn (Espaço/Enter, a click, or the button on a phone) the answer under a divider, with the origin. The answer fades in within
// --motion-respond; with prefers-reduced-motion it just appears. Cloze and media as before.
import type { Flashcard } from '~/types'

const props = defineProps<{
  card: Flashcard & { topic_name?: string | null }
  flipped: boolean
  /** Path of the subject ("Direito Constitucional › Controle") */
  label?: string
}>()
const emit = defineEmits<{ (e: 'flip'): void }>()

// On a touch screen the card never turns by a tap (prd-revisao-v5-fase-a RF-F3): scrolling or resting a finger on it
// revealed the answer by accident. Only the "Mostrar resposta" button there; a mouse click still turns it.
function onClick() {
  if (props.flipped) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return
  emit('flip')
}

const { renderQuestion, renderAnswer } = useCloze()
const { sanitize } = useSanitize()
const apiOrigin = useRuntimeConfig().public.apiBase.replace('/api', '')
const resolveMedia = (html: string) => html.replace(/src="\/storage\//g, `src="${apiOrigin}/storage/`)

const isCloze = computed(() => props.card.type === 'cloze')
const front = computed(() => sanitize(resolveMedia(isCloze.value ? renderQuestion(props.card.front, props.card.cloze_index ?? undefined) : props.card.front)))
const back = computed(() => sanitize(resolveMedia(isCloze.value ? renderAnswer(props.card.front, props.card.cloze_index ?? undefined) : props.card.back)))
const audio = computed(() => (props.flipped ? props.card.back_audio_url : props.card.front_audio_url))
</script>

<style scoped>
/* The card's own HTML (rich text, cloze, images): no classes to put utilities on. Tokens only. */
.card-html :deep(p) { margin: 0.25em 0; }
.card-html :deep(a) { pointer-events: none; color: inherit; text-decoration: none; }
.card-html :deep(img) { max-width: 100%; height: auto; border-radius: var(--radius-row); margin: 0.5rem 0; }
/* The answer arrives in --motion-respond; prefers-reduced-motion: it just appears */
@media (prefers-reduced-motion: no-preference) {
  .answer-in { animation: answer-in var(--motion-respond) var(--ease-calm) both; }
}
@keyframes answer-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
</style>
