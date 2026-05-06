<template>
  <div class="w-full max-w-2xl mx-auto relative">
    <!-- Main card -->
    <Transition name="card-slide" mode="out-in">
      <div
        :key="card.id"
        class="review-card relative rounded-2xl px-5 sm:px-12 py-8 sm:py-12 min-h-[280px] sm:min-h-[360px] flex flex-col items-center justify-center text-center"
        :class="[feedbackClass, { 'cursor-pointer select-none': !flipped }]"
        style="z-index: 1;"
        @click="!flipped && $emit('flip')"
        role="button"
        :aria-label="flipped ? 'Verso do card' : 'Toque para ver a resposta'"
      >
        <!-- Deck label -->
        <p class="text-micro uppercase tracking-[0.08em] text-base-muted opacity-50 mb-4">{{ deckName }}</p>

        <!-- Question (always visible) -->
        <div
          class="text-xl leading-relaxed max-w-md card-content"
          :class="flipped ? 'mb-6 font-medium text-base-primary' : 'font-display text-[1.35rem] text-base-primary'"
          v-html="displayFront"
        />

        <!-- Divider + Answer (expand reveal) -->
        <Transition name="answer-expand">
          <div v-if="flipped" class="w-full max-w-md">
            <div class="flex items-center gap-3 mb-6">
              <div class="flex-1 h-px bg-black/10 dark:bg-white/10" />
              <span class="text-micro uppercase tracking-widest text-base-muted/50">Resposta</span>
              <div class="flex-1 h-px bg-black/10 dark:bg-white/10" />
            </div>
            <div class="text-lg text-base-primary leading-relaxed card-content" v-html="displayBack" />
            <div v-if="currentAudio" class="mt-4 w-full max-w-xs mx-auto" @click.stop>
              <UiAudioPlayer :src="currentAudio" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Tap hint -->
    <!-- Tap hint removed — user already knows -->
  </div>
</template>

<script setup lang="ts">
import type { Flashcard } from '~/types'

const props = defineProps<{
  card: Flashcard
  flipped: boolean
  deckName?: string
  feedback?: 'success' | 'error' | null
}>()

defineEmits<{ flip: [] }>()

const { renderQuestion, renderAnswer } = useCloze()
const { sanitize } = useSanitize()
const config = useRuntimeConfig()
const apiOrigin = config.public.apiBase.replace('/api', '')

function resolveMedia(html: string): string {
  return html.replace(/src="\/storage\//g, `src="${apiOrigin}/storage/`)
}

const feedbackClass = computed(() => {
  if (props.feedback === 'success') return 'feedback-success'
  if (props.feedback === 'error') return 'feedback-error'
  return ''
})

const isCloze = computed(() => props.card.type === 'cloze')

const displayFront = computed(() => {
  const html = isCloze.value ? renderQuestion(props.card.front, props.card.cloze_index ?? undefined) : props.card.front
  return sanitize(resolveMedia(html))
})

const displayBack = computed(() => {
  const html = isCloze.value ? renderAnswer(props.card.front, props.card.cloze_index ?? undefined) : props.card.back
  return sanitize(resolveMedia(html))
})

const currentAudio = computed(() =>
  props.flipped ? props.card.back_audio_url : props.card.front_audio_url,
)
</script>

<style scoped>
.review-card {
  background: #FFFFFF;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid #EAEAEA;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
}

:where(.dark) .review-card {
  background: rgba(16, 14, 12, 0.85);
  border-color: rgba(217, 119, 6, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(217, 119, 6, 0.05);
}

/* Micro feedback — green glow on success */
.feedback-success {
  border-color: rgba(34, 197, 94, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(34, 197, 94, 0.15);
  animation: settle 0.3s ease;
}

/* Micro feedback — red glow + shake on error */
.feedback-error {
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(239, 68, 68, 0.15);
  animation: shake 0.3s ease;
}

@keyframes settle {
  0% { transform: scale(1); }
  50% { transform: scale(0.98); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* Card slide out (next card) */
.card-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card-slide-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}
.card-slide-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card-slide-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

/* Answer expand reveal */
.answer-expand-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.3s ease;
}
.answer-expand-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.card-content p { margin: 0.25em 0; display: inline; }
:deep(.card-content a) { pointer-events: none; color: inherit; text-decoration: none; }
:deep(.card-content img) { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 0.5rem 0; }
</style>
