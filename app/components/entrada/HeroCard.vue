<template>
  <EntradaCardStep
    ref="card"
    :flipped="flipped"
    :rated="rated"
    role="group"
    aria-label="Card de exemplo: tente lembrar antes de virar"
    tabindex="0"
    class="ec-hero-panel"
    data-testid="entry-hero-card"
    @keydown="onKey"
  >
    <!-- Prerendered and without JS: the answer in a <details>, no rating (it needs the page's code) -->
    <details v-if="!live" class="ec-reveal">
      <summary class="ec-btn ec-btn-primary ec-btn-wide">Mostrar resposta</summary>
      <div class="ec-answer">
        <p class="ec-answer-text">{{ ENTRY_CARD.back }}</p>
        <p class="ec-meta">{{ ENTRY_CARD.cite }}</p>
      </div>
    </details>
    <button v-else-if="rated" type="button" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-hero-next" @click="emit('continue')">Continuar: ver o resto em 1 min</button>
    <div v-else-if="flipped" class="ec-rate">
      <button type="button" class="ec-btn ec-btn-ghost" data-testid="entry-hero-forgot" @click="rate('forgot')">Não lembrei</button>
      <button type="button" class="ec-btn ec-btn-primary" data-testid="entry-hero-remembered" @click="rate('remembered')">Lembrei</button>
    </div>
    <button v-else type="button" class="ec-btn ec-btn-primary ec-btn-wide" data-testid="entry-hero-flip" @click="flip">Mostrar resposta</button>
  </EntradaCardStep>
</template>

<script setup lang="ts">
// The card of step 1 in the hero of /comecar (prd-entrada-primeira-dobra RF-1): the same card and intervals, one
// primary at a time (Mostrar resposta, then Lembrei, then Continuar to step 2). Visitor only and without state in the
// prerender: the HTML is the <details>, swapped for the buttons after mounting. The keys (Space turns, 1 / 2 rate) only
// with the focus in the card, never on the window: the hero's Space must keep scrolling. Nothing takes the focus on
// load; when the button pressed goes away, the focus stays on the card.
import { ENTRY_CARD, type EntryRating } from '~/utils/entrada'

const emit = defineEmits<{ continue: [] }>()
const { track } = useAnalytics()

const live = ref(false)
const flipped = ref(false)
const rated = ref<EntryRating | null>(null)
const card = ref<{ $el: HTMLElement } | null>(null)

onMounted(() => { live.value = true })

/** Runs the change; if the focus was on a button that leaves, it goes back to the card (not to the page's top) */
async function keepFocus(change: () => void) {
  const root = card.value?.$el
  const inside = !!root && root.contains(document.activeElement)
  change()
  await nextTick()
  if (inside && root && !root.contains(document.activeElement)) root.focus({ preventScroll: true })
}

function flip() {
  keepFocus(() => { flipped.value = true })
}

function rate(rating: EntryRating) {
  keepFocus(() => { rated.value = rating })
  track('entry_card_rated', { rating, position: 'hero' })
}

function onKey(e: KeyboardEvent) {
  if (!live.value || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === ' ' && e.target === e.currentTarget && !flipped.value) {
    e.preventDefault()
    flip()
  } else if (flipped.value && !rated.value && (e.key === '1' || e.key === '2')) {
    e.preventDefault()
    rate(e.key === '1' ? 'forgot' : 'remembered')
  }
}
</script>
