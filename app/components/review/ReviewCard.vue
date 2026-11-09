<template>
  <section
    ref="root"
    class="review-card relative flex w-full flex-col gap-4 rounded-hero bg-raised shadow-2"
    :class="[!flipped && 'select-none pointer-fine:cursor-pointer', swipeOn && 'touch-pan-y', swipe.dragging.value && 'swipe-drag']"
    :data-enter="enter || undefined"
    :style="swipeStyle"
    :aria-label="flipped ? 'Card com a resposta' : 'Card: Espaço para ver a resposta'"
    :role="flipped ? 'region' : 'button'"
    :tabindex="flipped ? -1 : 0"
    data-review-card
    data-testid="review-card"
    @click="onClick"
  >
    <!-- The direction of the swipe while the finger moves (text, not only the tilt; RF-F10) -->
    <p
      v-if="swipe.direction.value"
      class="pointer-events-none absolute top-3 rounded-full px-3 py-1 text-meta font-semibold"
      :class="[swipe.direction.value === 'right' ? 'right-3 bg-success-subtle text-success' : 'left-3 bg-subtle text-fg-strong', swipe.armed.value ? 'opacity-100' : 'opacity-70']"
      aria-hidden="true"
      data-testid="review-swipe-hint"
    >
      {{ swipe.direction.value === 'right' ? `${swipeLabels.right} →` : `← ${swipeLabels.left}` }}
    </p>
    <p v-if="label" class="text-label font-semibold text-fg-muted">{{ label }}</p>
    <div class="card-html card-q break-words text-fg-strong" data-testid="review-front" v-html="front" />
    <div
      v-if="flipped"
      class="answer-in flex flex-col gap-4 pt-4.5"
      data-testid="review-answer"
    >
      <div class="card-html card-a break-words text-fg-strong" v-html="back" />
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
// The card of the session (prd-4d-revisao-v3 RF-F3; E2 skin, prd-visual-e2 RF-2.1): the subject as a label, the
// question (25/30 px), and after the turn (Espaço/Enter, a click, or the button on a phone) the answer (19/20 px) under
// a hairline, with the origin in a soft tile. No flip: the answer opens below in 180 ms (opacity and 6 px); with
// prefers-reduced-motion it just appears. Radius 24, shadow-2. Cloze and media as before.
import type { Flashcard } from '~/types'

const props = defineProps<{
  card: Flashcard & { topic_name?: string | null }
  flipped: boolean
  /** Path of the subject ("Direito Constitucional › Controle") */
  label?: string
  /** Swipe to rate is on (/me.review_swipe) and allowed for this card (prd-revisao-v5-fase-b RF-F10) */
  swipeEnabled?: boolean
  /** The labels of the two directions: "Lembrei" / "Não lembrei" or "Bom" / "De novo" */
  swipeLabels?: { right: string; left: string }
  /** The next card after the feedback band: it comes in from the right (240 ms, 28 px; ADR-035 §6) */
  enter?: boolean
}>()
const emit = defineEmits<{ (e: 'flip'): void; (e: 'swipe', rating: 1 | 3): void }>()

// Swipe (RF-F10): only with the answer on screen; the card follows the finger unless prefers-reduced-motion
const root = ref<HTMLElement | null>(null)
const swipeOn = computed(() => !!props.swipeEnabled && props.flipped)
const swipe = useSwipeRate(root, { enabled: () => swipeOn.value, onRate: r => emit('swipe', r) })
const swipeLabels = computed(() => props.swipeLabels ?? { right: 'Lembrei', left: 'Não lembrei' })
const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const swipeStyle = computed(() => (swipe.dragging.value && !reducedMotion
  ? { transform: `translateX(${swipe.dx.value}px) rotate(${Math.max(-6, Math.min(6, swipe.dx.value / 30))}deg)` }
  : undefined))

// On a touch screen the card never turns by a tap (prd-revisao-v5-fase-a RF-F3): scrolling or resting a finger on it
// revealed the answer by accident. Only the "Mostrar resposta" button there; a mouse click still turns it.
function onClick(e: MouseEvent) {
  if (props.flipped) return
  // detail 0 = keyboard or screen reader activation (VoiceOver/TalkBack double tap): the "button" keeps working there
  if (e.detail !== 0 && typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) return
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
/* Back to its place when the finger leaves below the threshold */
@media (prefers-reduced-motion: no-preference) {
  section:not(.swipe-drag) { transition: transform var(--motion-respond) var(--ease-calm); }
}
.review-card { padding: 24px 22px; }
.card-q { font-size: 1.5625rem; line-height: 1.22; font-weight: 700; letter-spacing: -0.018em; }
.card-a { font-size: 1.1875rem; line-height: 1.5; }
.answer-in { box-shadow: 0 -1px 0 var(--hairline); }
@media (min-width: 640px) {
  .review-card { min-height: 18rem; padding: 36px 40px; }
  .card-q { font-size: 1.875rem; }
  .card-a { font-size: 1.25rem; }
}
/* The answer arrives in 180 ms; prefers-reduced-motion: it just appears */
@media (prefers-reduced-motion: no-preference) {
  .answer-in { animation: answer-in var(--dur-fast) var(--ease-out) both; }
  .review-card[data-enter] { animation: card-enter var(--dur-base) var(--ease-out) both; }
}
@keyframes card-enter {
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: none; }
}
@keyframes answer-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
</style>
