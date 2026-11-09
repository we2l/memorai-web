<template>
  <div
    :key="feedback.id"
    class="fb"
    :data-kind="ok ? 'ok' : 'again'"
    :data-auto="auto ? 'true' : undefined"
    :data-compact="compact || undefined"
    role="status"
    data-testid="review-feedback"
    :data-remembered="ok"
    @pointerdown="cancel('tap')"
  >
    <div class="flex items-center gap-3.5">
      <picture class="fb-mascot shrink-0" aria-hidden="true">
        <source :srcset="ok ? celebratingAvif : thinkingAvif" type="image/avif">
        <img :src="ok ? celebratingWebp : thinkingWebp" alt="" width="58" height="58" loading="eager" decoding="async">
      </picture>
      <p class="min-w-0 flex-1">
        <span class="fb-title block" data-testid="review-feedback-title">{{ feedback.title }}</span>
        <span v-if="feedback.when" class="mt-0.5 block text-body-sm">{{ feedback.when }}</span>
      </p>
    </div>
    <div class="mt-3.5 flex flex-wrap items-center gap-2.5">
      <UiButton
        v-if="feedback.canWhy"
        variant="outline"
        :icon-left="Sparkles"
        aria-keyshortcuts="P"
        data-testid="review-why"
        @click="onWhy"
      >
        Por quê?
      </UiButton>
      <button
        type="button"
        class="fb-continue inline-flex min-h-touch flex-1 items-center justify-center rounded-chip px-5 text-body font-semibold"
        aria-keyshortcuts="Enter"
        data-testid="review-continue"
        @click="$emit('continue')"
      >
        Continuar
      </button>
      <!-- After a swipe: undo for 5 s (prd-revisao-v5-fase-b RF-F10) -->
      <button v-if="feedback.undo" type="button" class="hit-touch font-semibold underline underline-offset-2" data-testid="review-feedback-undo" @click="$emit('undo')">Desfazer</button>
    </div>
    <!-- "Lembrei" goes on by itself in 1.2 s: the bar shows the wait; a tap, "Por quê?" or another key stops it -->
    <div v-if="auto" class="fb-auto mt-3.5" aria-hidden="true"><span /></div>
  </div>
</template>

<script setup lang="ts">
// The feedback band of the review (prd-visual-e2 RF-2.4, ADR-035 §5-§6): it rises from the bottom (240 ms, drawer curve;
// on the desktop it appears under the card), with the dolphin reacting at 58 px (celebrating on "Lembrei", thinking on
// "Não lembrei", one entrance, no loop). Green on a hit, amber on a miss, never red. "Lembrei" goes on by itself in
// 1.2 s (decision of the owner, 08/11) unless a tap, "Por quê?" or a key other than Enter/Space stops it; "Não
// lembrei" waits for "Continuar". "Por quê?" only on a miss (the owner): on a hit it lives in the ⋯ of the card.
// role=status: the screen reader hears it without the focus moving. With prefers-reduced-motion only the opacity
// moves, and the time still runs (RN-6).
import { Sparkles } from 'lucide-vue-next'
import celebratingAvif from '~/assets/mascots/mascot-baigi-celebrating.avif'
import celebratingWebp from '~/assets/mascots/mascot-baigi-celebrating.webp'
import thinkingAvif from '~/assets/mascots/mascot-baigi-thinking.avif'
import thinkingWebp from '~/assets/mascots/mascot-baigi-thinking.webp'
import { AUTO_ADVANCE_MS, isOkKind, type FeedbackKind } from '~/utils/reviewFeedback'

export interface RatingFeedback {
  id: number
  kind: FeedbackKind
  title: string
  /** "Volta em 16 dias." */
  when: string
  /** Goes on by itself in 1.2 s (the hits) */
  autoAdvance: boolean
  canWhy: boolean
  undo?: boolean
}

const props = defineProps<{
  feedback: RatingFeedback
  /** Inside an article (the blog quiz): a smaller dolphin, no rise from the bottom and no lifted shadow */
  compact?: boolean
}>()
const emit = defineEmits<{
  (e: 'continue'): void
  (e: 'why'): void
  (e: 'undo'): void
  (e: 'cancel-auto', via: 'tap' | 'key' | 'why'): void
}>()

const ok = computed(() => isOkKind(props.feedback.kind))
const auto = ref(props.feedback.autoAdvance)
let timer: ReturnType<typeof setTimeout> | null = null

function start() {
  if (timer) clearTimeout(timer)
  timer = auto.value ? setTimeout(() => { timer = null; emit('continue') }, AUTO_ADVANCE_MS) : null
}

/** Stops the 1.2 s (a tap on the band, "Por quê?", another key); Continuar still goes on. */
function cancel(via: 'tap' | 'key' | 'why') {
  if (!auto.value) return
  auto.value = false
  if (timer) clearTimeout(timer)
  timer = null
  emit('cancel-auto', via)
}

function onWhy() {
  cancel('why')
  emit('why')
}

watch(() => props.feedback.id, () => {
  auto.value = props.feedback.autoAdvance
  start()
})
onMounted(start)
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

defineExpose({ cancel })
</script>

<style scoped>
.fb { padding: 18px 20px 16px; border-radius: var(--radius-sheet); background: var(--fb-again-bg); color: var(--fb-again-fg); box-shadow: var(--elev-band); }
.fb[data-kind='ok'] { background: var(--fb-ok-bg); color: var(--fb-ok-fg); }
.fb-title { font-size: 1.1875rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
.fb-mascot img { display: block; width: 58px; height: 58px; object-fit: contain; transform-origin: 50% 90%; }
.fb-continue { background: var(--fb-again-strong); color: var(--fb-again-ink); transition: transform var(--dur-press) var(--ease-out); }
.fb[data-kind='ok'] .fb-continue { background: var(--fb-ok-strong); color: var(--fb-ok-ink); }
.fb-continue:active { transform: scale(0.97); }
.fb-auto { height: 4px; border-radius: 2px; overflow: hidden; background: color-mix(in srgb, currentColor 18%, transparent); }
.fb-auto span { display: block; height: 100%; background: currentColor; opacity: 0.5; transform-origin: left; }

@media (prefers-reduced-motion: no-preference) {
  .fb { animation: fb-rise var(--dur-base) var(--ease-drawer) both; }
  .fb[data-kind='ok'] .fb-mascot img { animation: fb-react-ok 420ms var(--ease-out) 60ms both; }
  .fb[data-kind='again'] .fb-mascot img { animation: fb-react-again 320ms var(--ease-out) 60ms both; }
  .fb-auto span { animation: fb-countdown 1200ms linear both; }
  /* In an article the dolphin only comes in, without the jump of the review */
  .fb[data-compact][data-kind='ok'] .fb-mascot img { animation-name: fb-react-again; }
}
@media (prefers-reduced-motion: reduce) {
  .fb { animation: fb-fade 160ms linear both; }
  .fb-continue:active { transform: none; }
  .fb-auto { display: none; }
}
@media (min-width: 1024px) {
  .fb { padding: 18px 22px; border-radius: var(--radius-hero); box-shadow: var(--elev-1); }
}
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
  .fb { animation-name: fb-up; }
}

/* Compact (blog): calmer, it lives in the text */
.fb[data-compact] { box-shadow: none; border-radius: var(--radius-card); padding: 14px 16px; animation-name: fb-up; }
.fb[data-compact] .fb-mascot img { width: 44px; height: 44px; }
.fb[data-compact] .fb-title { font-size: 1.0625rem; }
@media (prefers-reduced-motion: reduce) {
  .fb[data-compact] { animation-name: fb-fade; }
}

@keyframes fb-rise { from { transform: translateY(100%); } to { transform: none; } }
@keyframes fb-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes fb-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fb-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes fb-react-ok {
  0% { opacity: 0; transform: translateY(8px) scale(0.9) rotate(-6deg); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.04) rotate(3deg); }
  100% { transform: none; }
}
@keyframes fb-react-again {
  0% { opacity: 0; transform: translateY(6px) scale(0.94); }
  100% { opacity: 1; transform: none; }
}
</style>
