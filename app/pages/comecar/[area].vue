<template>
  <div class="flex min-h-dvh flex-col bg-page text-fg">
    <ReviewTopBar
      back-to="/comecar"
      scope-text=""
      :batch="phase === 'review' ? batch : null"
      :can-undo="false"
      :can-edit="false"
      onboarding
      :step-label="deck ? `Exemplo de ${deck.name}` : 'Exemplo'"
    />
    <p class="sr-only" aria-live="polite" data-testid="guest-announce">{{ announcement }}</p>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <!-- Loading: the size of the card, no jump when it arrives -->
      <div v-if="phase === 'loading'" class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-gutter py-6" aria-busy="true">
        <span class="sr-only" role="status">Carregando os cards…</span>
        <UiSkeleton variant="block" size="lg" />
      </div>

      <div v-else-if="phase === 'error'" class="mx-auto flex max-w-md flex-col items-center gap-4 px-gutter py-16 text-center" data-testid="guest-error">
        <p role="alert" class="text-body text-fg">Não conseguimos carregar os cards. Confira a internet e tente de novo.</p>
        <UiButton variant="primary" @click="load">Tentar de novo</UiButton>
      </div>

      <!-- The mini-lote: the review's own card, ratings and origin -->
      <div v-else-if="phase === 'review' && current !== null" class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-gutter py-6">
        <p v-if="isRepeat" class="text-center text-meta text-fg-muted" data-testid="guest-repeat">Voltou no fim do lote: na primeira vez você marcou {{ lastLabel }}.</p>
        <ReviewCard :card="currentCard" :flipped="flipped" :label="deck!.topic_name.replace(/^Exemplo · /, '')" @flip="flip">
          <template #origin>
            <ReviewOrigin :origin="currentOrigin" back-to="" />
          </template>
        </ReviewCard>
      </div>

      <!-- Result (RF-F3): what happened, when each card comes back, and the reason to save -->
      <div v-else-if="phase === 'result' && summary" class="mx-auto flex w-full max-w-xl flex-col gap-6 px-gutter py-8" data-testid="guest-result">
        <div class="flex items-center gap-4">
          <UiBaigiMascot :size="72" state="celebrating" visible />
          <div class="min-w-0">
            <h1 ref="resultTitle" class="text-page-title-sm text-fg-strong outline-none" tabindex="-1" data-testid="guest-remembered">
              Você lembrou {{ summary.remembered }} de {{ summary.total }}
            </h1>
            <p v-if="summary.repeated" class="mt-1 text-body text-fg-muted" data-testid="guest-repeated">
              {{ summary.repeated === 1 ? '1 card voltou' : `${summary.repeated} cards voltaram` }} no fim do lote. Na segunda vez, você lembrou {{ summary.rememberedOnRepeat }}.
            </p>
          </div>
        </div>

        <section aria-labelledby="agenda-title" class="flex flex-col gap-2">
          <h2 id="agenda-title" class="text-label font-semibold text-fg-muted">Quando cada um volta</h2>
          <ul class="divide-y divide-line rounded-card bg-subtle px-1" data-testid="guest-agenda">
            <li v-for="a in summary.agenda" :key="a.label" class="flex items-baseline justify-between gap-3 px-3 py-3 text-body">
              <span class="text-fg">{{ capitalize(returnText(a.label)) }}</span>
              <span class="font-semibold text-fg-strong tabular-nums">{{ a.count === 1 ? '1 card' : `${a.count} cards` }}</span>
            </li>
          </ul>
        </section>

        <UiSection variant="tinted" label="Estimativa" data-testid="guest-growth">
          <p class="text-body text-fg-strong">Lembrando sempre, um card volta em {{ growthText(deck!.intervals.good, deck!.growth_days) }}.</p>
          <p class="mt-1 text-meta text-fg-muted">Calculado pelo FSRS, o algoritmo do Baigi, com os parâmetros padrão. Muda com as suas respostas.</p>
        </UiSection>

        <div class="flex flex-col gap-3" data-testid="guest-save">
          <p class="text-body text-fg">{{ auth.user ? 'Salve no seu caderno para eles voltarem na hora certa.' : 'Crie a conta para salvar. Eu te aviso às 19h quando eles voltarem.' }}</p>
          <template v-if="auth.user">
            <UiButton variant="primary" to="/comecar/pronto" block data-testid="guest-save-account">Salvar no meu caderno</UiButton>
          </template>
          <template v-else>
            <UiButton variant="primary" to="/criar-conta?salvar=1" block data-testid="guest-signup">Criar conta e salvar</UiButton>
            <div class="flex flex-wrap justify-center gap-2">
              <UiButton variant="ghost" to="/entrar?redirect=/comecar/pronto" data-testid="guest-login">Já tenho conta</UiButton>
              <UiButton variant="ghost" to="/" data-testid="guest-later">Agora não</UiButton>
            </div>
            <p class="text-center text-label text-fg-muted">Seu lote fica guardado neste aparelho.</p>
          </template>
        </div>
      </div>
    </main>

    <!-- The review's bottom bar: "Mostrar resposta", then the 4 ratings with the real intervals -->
    <footer v-if="phase === 'review' && current !== null" class="shrink-0 border-t border-line bg-raised px-gutter pt-3 pb-safe-bottom" data-testid="review-footer">
      <div class="mx-auto w-full max-w-3xl pb-3">
        <ReviewRatings v-if="flipped" :intervals="deck!.intervals" @rate="rate" />
        <UiButton v-else variant="primary" block aria-keyshortcuts="Space" data-testid="review-show" @click="flip">Mostrar resposta</UiButton>
        <p class="mt-2 hidden text-center text-label text-fg-muted pointer-fine:block">
          <kbd class="font-sans">1</kbd> <kbd class="font-sans">2</kbd> <kbd class="font-sans">3</kbd> <kbd class="font-sans">4</kbd> · Espaço mostrar
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// The visitor's mini-lote (prd-onboarding-v4 RF-F2, RF-F3; ADR-032): 6 hand-written cards of the area in the review's
// own components, before any account. The labels under the ratings come from the API (the session's code); "De novo"
// and "Difícil" come back at the end of the lote like the 1 min learning step. Each rating is kept on this device
// and goes to the account at sign-up (/comecar/pronto). No AI, nothing written on the server.
import type { CardOrigin, Flashcard } from '~/types'
import {
  growthText, guestSummary, isGuestArea, loadGuestProgress, nextGuestCard, returnText, saveGuestProgress,
  type GuestDeck, type GuestProgress, type GuestRating,
} from '~/utils/guestProgress'

definePageMeta({ layout: false, chrome: 'focus' })

const route = useRoute()
const auth = useAuthStore()
const { $api } = useNuxtApp()
const { track } = useAnalytics()

const area = String(route.params.area)
if (!isGuestArea(area)) throw createError({ statusCode: 404, statusMessage: 'Página não encontrada', fatal: true })

const deck = ref<GuestDeck | null>(null)
const progress = ref<GuestProgress | null>(null)
const phase = ref<'loading' | 'error' | 'review' | 'result'>('loading')
const current = ref<number | null>(null)
const flipped = ref(false)
const announcement = ref('')
const resultTitle = ref<HTMLElement | null>(null)

useHead(() => ({ title: deck.value ? `Exemplo de ${deck.value.name} · Baigi` : 'Começar · Baigi' }))

const RATING_LABEL: Record<GuestRating, string> = { 1: 'De novo', 2: 'Difícil', 3: 'Bom', 4: 'Fácil' }
const indices = computed(() => deck.value?.cards.map(c => c.index) ?? [])
const card = computed(() => deck.value?.cards.find(c => c.index === current.value) ?? null)
const currentCard = computed(() => ({ id: `guest-${current.value}`, type: 'basic', front: card.value?.front ?? '', back: card.value?.back ?? '' }) as unknown as Flashcard)
const currentOrigin = computed<CardOrigin>(() => ({ kind: 'note', note_id: '', topic_id: null, title: `${deck.value?.note_title ?? ''}${card.value?.source ? ` · ${card.value.source}` : ''}` }))
const reviews = computed(() => progress.value?.reviews ?? [])
const isRepeat = computed(() => current.value !== null && reviews.value.some(r => r.index === current.value))
const lastLabel = computed(() => {
  const last = [...reviews.value].reverse().find(r => r.index === current.value)
  return last ? `"${RATING_LABEL[last.rating]}"` : ''
})
const seen = computed(() => new Set(reviews.value.map(r => r.index)).size)
const batch = computed(() => {
  const size = indices.value.length
  const position = Math.min(isRepeat.value ? size : seen.value + 1, size)
  return { index: 1, total: 1, card: position, size, done: size ? seen.value / size : 0 }
})
const summary = computed(() => (deck.value && progress.value ? guestSummary(progress.value.reviews, deck.value.intervals) : null))

async function load() {
  phase.value = 'loading'
  try {
    deck.value = (await $api<{ data: GuestDeck }>(`/onboarding/areas/${area}`)).data
  } catch (e) {
    reportApiError(e, { silent: true })
    phase.value = 'error'
    return
  }
  // A lote of this area already on the device (same cards) picks up where it stopped; another area starts over
  const saved = loadGuestProgress()
  progress.value = saved && saved.area === area && saved.version === deck.value.version
    ? saved
    : { v: 1, area, version: deck.value.version, reviews: [], done: false }
  if (progress.value.done) return showResult()
  advance()
}

function advance() {
  flipped.value = false
  current.value = nextGuestCard(indices.value, reviews.value)
  if (current.value === null) return finish()
  phase.value = 'review'
  void nextTick(() => document.querySelector<HTMLElement>('[data-review-card]')?.focus())
}

function flip() {
  if (phase.value !== 'review' || flipped.value) return
  flipped.value = true
  announcement.value = 'Resposta à mostra. Avalie de 1 a 4.'
}

function rate(rating: GuestRating) {
  if (!flipped.value || current.value === null || !progress.value) return
  const pass = reviews.value.filter(r => r.index === current.value).length + 1
  progress.value.reviews.push({ index: current.value, rating, reviewed_at: new Date().toISOString() })
  saveGuestProgress(progress.value)
  track('guest_card_rated', { area, index: current.value, rating, pass })
  announcement.value = `${RATING_LABEL[rating]}.`
  advance()
}

function finish() {
  if (!progress.value || !deck.value) return
  progress.value.done = true
  saveGuestProgress(progress.value)
  const s = guestSummary(progress.value.reviews, deck.value.intervals)
  track('guest_batch_done', { area, remembered: s.remembered, total: s.total, repeats: s.repeated })
  showResult()
}

function showResult() {
  phase.value = 'result'
  void nextTick(() => resultTitle.value?.focus())
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Space/Enter turns the card, 1–4 rates (the session's keys); never while typing or with a modifier
function onKeydown(e: KeyboardEvent) {
  if (phase.value !== 'review' || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!flipped.value && (e.key === ' ' || e.key === 'Enter')) {
    if (target?.closest('a, button:not([data-review-card])')) return
    e.preventDefault()
    flip()
  } else if (flipped.value && ['1', '2', '3', '4'].includes(e.key)) {
    e.preventDefault()
    rate(Number(e.key) as GuestRating)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (route.query.from === 'landing') track('onboarding_area_chosen', { area, source: 'landing' })
  void load()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
