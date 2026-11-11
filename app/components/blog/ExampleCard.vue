<template>
  <figure
    ref="root"
    class="rounded-card bg-raised p-5 shadow-1 outline-none sm:p-6"
    tabindex="-1"
    aria-label="Card de exemplo"
    aria-keyshortcuts="Space 1 2"
    data-testid="blog-example-card"
    :data-state="state"
    @keydown="onKey"
  >
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span class="text-label font-semibold text-fg-muted">Card de exemplo</span>
      <span v-if="source" class="text-label text-fg-muted">{{ source }}</span>
    </div>
    <p class="break-words text-section text-fg-strong" data-testid="blog-example-question">{{ q }}</p>

    <!-- The answer is in the HTML from the start (readers without JS and search engines); with JS it waits for the try -->
    <div v-show="state !== 'front'" class="mt-4 border-t border-line pt-4" data-testid="blog-example-answer">
      <p class="mb-1 text-label text-fg-muted">Resposta</p>
      <p class="break-words text-body text-fg">{{ a }}</p>
    </div>
    <noscript><p class="mt-4 border-t border-line pt-4 text-body text-fg">{{ a }}</p></noscript>

    <div class="mt-5">
      <ReviewFeedback v-if="feedback" ref="band" compact :feedback="feedback" @continue="finish" />
      <UiButton v-else-if="state === 'front'" variant="secondary" block data-testid="blog-example-reveal" aria-keyshortcuts="Space" @click="reveal">
        Mostrar resposta
      </UiButton>
      <div v-else-if="state === 'back'" class="grid grid-cols-2 gap-2" role="group" aria-label="Você lembrou?">
        <UiButton variant="secondary" block data-testid="blog-example-again" aria-keyshortcuts="1" @click="rate(false)">
          Não lembrei<kbd class="ml-2 hidden font-sans text-label text-fg-muted pointer-fine:inline" aria-hidden="true">1</kbd>
        </UiButton>
        <UiButton variant="secondary" block data-testid="blog-example-ok" aria-keyshortcuts="2" @click="rate(true)">
          Lembrei<kbd class="ml-2 hidden font-sans text-label text-fg-muted pointer-fine:inline" aria-hidden="true">2</kbd>
        </UiButton>
      </div>
      <div v-else class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-meta text-fg-muted">{{ doneText }}</p>
        <UiButton variant="ghost" size="sm" data-testid="blog-example-again-try" @click="restart">Testar de novo</UiButton>
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
// An example card inside the text that turns (prd-blog-v2 RF-V2): the front, "Mostrar resposta", then "Não lembrei" /
// "Lembrei" and the review's answer band (ReviewFeedback compact, the same of the blog quiz: celebrating dolphin and
// green on a hit, thinking and amber on a miss). Calm: no purple here (the page's one purple is the end call). Keys
// with the focus in the card: Espaço shows, 1 = Não lembrei, 2 = Lembrei, Enter goes on. Nothing is saved.
import type { RatingFeedback } from '~/components/review/ReviewFeedback.vue'
import { FIRST_STABILITY, intervalFor } from '~/utils/forgetting'
import { feedbackTitle, feedbackWhen } from '~/utils/reviewFeedback'

const props = defineProps<{ q: string, a: string, source?: string }>()

/** Same intervals as the blog quiz: a new card the reader remembered comes back in ~2 days (FSRS-6 defaults) */
const GOOD_DAYS = Math.round(intervalFor(FIRST_STABILITY, 0.9))
const AGAIN_TEXT = 'ainda hoje'

const root = ref<HTMLElement | null>(null)
const state = ref<'front' | 'back' | 'done'>('front')
const remembered = ref(false)
const feedback = ref<RatingFeedback | null>(null)
const band = ref<{ cancel: (via: 'tap' | 'key' | 'why') => void } | null>(null)

const doneText = computed(() => (remembered.value ? `No Baigi, este card voltaria em ${GOOD_DAYS} dias.` : `No Baigi, este card voltaria ${AGAIN_TEXT}.`))

async function reveal() {
  if (state.value !== 'front') return
  state.value = 'back'
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-testid="blog-example-ok"]')?.focus()
}

function rate(ok: boolean) {
  if (state.value !== 'back' || feedback.value) return
  remembered.value = ok
  const kind = ok ? 'ok' : 'again'
  feedback.value = {
    id: Date.now(),
    kind,
    title: feedbackTitle(kind, props.q),
    when: ok ? feedbackWhen('ok', `${GOOD_DAYS}d`) : `Ele volta ${AGAIN_TEXT}.`,
    // One card: nothing comes next, so the band waits for "Continuar" on a hit too
    autoAdvance: false,
    canWhy: false,
  }
  void nextTick(() => root.value?.querySelector<HTMLElement>('[data-testid="review-continue"]')?.focus())
}

async function finish() {
  feedback.value = null
  state.value = 'done'
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-testid="blog-example-again-try"]')?.focus()
}

async function restart() {
  state.value = 'front'
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-testid="blog-example-reveal"]')?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const onControl = e.target instanceof HTMLElement && !!e.target.closest('button, a')
  if (feedback.value) {
    if ((e.key === 'Enter' || e.key === ' ') && !onControl) {
      e.preventDefault()
      void finish()
    }
    return
  }
  if (e.key === ' ' && state.value === 'front' && !onControl) {
    e.preventDefault()
    void reveal()
  } else if ((e.key === '1' || e.key === '2') && state.value === 'back') {
    e.preventDefault()
    rate(e.key === '2')
  }
}
</script>
