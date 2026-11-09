<template>
  <div class="flex min-h-dvh flex-col bg-page text-fg">
    <ReviewTopBar
      back-to="/comecar"
      scope-text=""
      :batch="phase === 'review' ? batch : null"
      :can-undo="false"
      :can-edit="false"
      onboarding
      exit-label="Sair do exemplo"
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
        <p v-if="isRepeat" class="text-center text-meta text-fg-muted" data-testid="guest-repeat">Voltou no fim do lote: tente lembrar de novo.</p>
        <ReviewCard :card="currentCard" :flipped="flipped" :label="deck!.topic_name.replace(/^Exemplo · /, '')" @flip="flip">
          <template #origin>
            <ReviewOrigin :origin="currentOrigin" back-to="" />
          </template>
        </ReviewCard>
      </div>

      <!-- Result (RF-F8): a victory with memory, the agenda and the curve -->
      <!-- E2 (prd-visual-e2 Fase 2b): the end of a lote of the review, with the dolphin, the arc and the streak chip -->
      <div v-else-if="phase === 'result' && summary" class="mx-auto flex w-full max-w-xl flex-col gap-6 px-gutter pt-8 pb-8" data-testid="guest-result">
        <div class="flex flex-col items-center text-center" data-testid="guest-remembered">
          <picture class="guest-mascot" aria-hidden="true">
            <source :srcset="celebratingAvif" type="image/avif">
            <img :src="celebratingWebp" alt="" width="104" height="104" decoding="async">
          </picture>
          <h1 class="mt-2 text-display text-fg-strong outline-none" tabindex="-1" data-celebration-title>Você lembrou {{ summary.remembered }} de {{ summary.total }}</h1>
          <UiTag class="guest-chip mt-3" tone="streak" :icon="Flame" size="lg">Dia 1 da sequência</UiTag>
          <UiArc class="mt-4" :got="summary.remembered" :of="summary.total" animate>
            <UiNumber :value="summary.remembered" :unit="`de ${summary.total}`" size="xl" aria-hidden="true" />
          </UiArc>
        </div>
        <p v-if="summary.repeated" class="-mt-3 text-center text-body text-fg-muted" data-testid="guest-repeated">
          {{ summary.repeated === 1 ? '1 card voltou' : `${summary.repeated} cards voltaram` }} no fim do lote. Na segunda vez, você lembrou {{ summary.rememberedOnRepeat }}.
        </p>

        <section aria-labelledby="agenda-title" class="flex flex-col gap-2">
          <h2 id="agenda-title" class="text-label font-semibold text-fg-muted">Quando cada um volta</h2>
          <ul class="divide-y divide-hairline rounded-card bg-soft px-1" data-testid="guest-agenda">
            <li v-for="a in summary.agenda" :key="a.label" class="flex items-baseline justify-between gap-3 px-3 py-3 text-body">
              <span class="text-fg">{{ capitalize(returnText(a.label)) }}</span>
              <span class="font-semibold text-fg-strong tabular-nums">{{ a.count === 1 ? '1 card' : `${a.count} cards` }}</span>
            </li>
          </ul>
        </section>

        <LazyOnboardingForgettingCurve v-if="deck?.forgetting_curve" :curve="deck.forgetting_curve" />

        <UiButton variant="primary" block data-testid="guest-continue" @click="openCommit">Escolher meu ritmo</UiButton>
      </div>

      <!-- Commitment before the account (RF-F9): one screen, two questions, then the save -->
      <div v-else-if="phase === 'commit'" class="mx-auto flex w-full max-w-xl flex-col gap-6 px-gutter py-8" data-testid="guest-commit">
        <div>
          <h1 ref="commitTitle" class="text-page-title-sm text-fg-strong outline-none" tabindex="-1">Seu ritmo de estudo</h1>
          <p class="mt-1 text-body text-fg-muted">Duas respostas e o seu Hoje já começa montado. Dá para mudar depois.</p>
        </div>

        <div class="flex flex-col gap-3">
          <LazyUiRadioGroup v-model="examChoice" label="Tem data de prova?" name="guest-exam" variant="cards" :columns="2" :options="EXAM_OPTIONS" />
          <LazyUiInput
            v-if="examChoice === 'date'"
            id="guest-exam-date"
            v-model="examDate"
            type="date"
            label="Data da prova"
            :min="tomorrow"
            :error="examError"
            data-testid="guest-exam-date"
          />
        </div>

        <LazyUiRadioGroup v-model="goalChoice" label="Quantos lotes por dia?" :hint="`Um lote tem ${REVIEW_BATCH} cards, uns ${cardsMinutes(REVIEW_BATCH)} minutos.`" name="guest-goal" variant="cards" :columns="3" :options="goalOptions" />

        <div class="flex flex-col gap-3" data-testid="guest-save">
          <p class="text-body text-fg">{{ auth.user ? 'Salve no seu caderno para eles voltarem na hora certa.' : 'Crie a conta para salvar. Eu te aviso às 19h quando eles voltarem.' }}</p>
          <template v-if="auth.user">
            <UiButton variant="primary" block data-testid="guest-save-account" @click="commitAndGo('/comecar/pronto')">Salvar no meu caderno</UiButton>
          </template>
          <template v-else>
            <UiButton variant="primary" block data-testid="guest-signup" @click="commitAndGo('/criar-conta?salvar=1')">Criar conta e salvar</UiButton>
            <div class="flex flex-wrap justify-center gap-2">
              <UiButton variant="ghost" data-testid="guest-login" @click="commitAndGo('/entrar?redirect=/comecar/pronto')">Já tenho conta</UiButton>
              <UiButton variant="ghost" data-testid="guest-later" @click="commitAndGo('/')">Agora não</UiButton>
            </div>
            <p class="text-center text-label text-fg-muted">Seu lote fica guardado neste aparelho.</p>
          </template>
        </div>
      </div>
    </main>

    <!-- The review's bottom bar: "Mostrar resposta", then "Não lembrei / Lembrei" with the real intervals -->
    <footer v-if="phase === 'review' && current !== null" class="shrink-0 bg-page px-gutter pt-3 pb-safe-bottom" data-testid="review-footer">
      <div class="mx-auto w-full max-w-3xl pb-3">
        <!-- The answer band of the review (E2): "Lembrei" goes on in 1.2 s, "Não lembrei" waits; no "Por quê?" here -->
        <LazyReviewFeedback v-if="feedback" ref="band" :feedback="feedback" @continue="continueAfterBand" />
        <ReviewRatings v-else-if="flipped" :intervals="ratingIntervals" mode="two" again-text="no fim do lote" @rate="rate" />
        <UiButton v-else variant="primary" block aria-keyshortcuts="Space" data-testid="review-show" @click="flip">Mostrar resposta</UiButton>
        <p v-if="!feedback" class="mt-2 hidden text-center text-label text-fg-muted pointer-fine:block" data-testid="review-keys">{{ reviewKeysHint('two') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// The visitor's mini-lote (prd-onboarding-v4 RF-F2, RF-F3; ADR-032; round 2: prd-revisao-v5-fase-a RF-F7..F9): 6
// hand-written cards of the area in the review's own components, before any account, rated "Não lembrei / Lembrei"
// (Again and Good). The sample deck has no learning steps, so "Lembrei" says "volta em 2 dias"; "Não lembrei" comes
// back at the end of the lote. Then a victory (remembered, Dia 1, the agenda and the forgetting curve) and one screen
// of commitment (exam date and lotes per day) before the sign-up. Everything stays on this device until the account
// exists (/comecar/pronto). No AI, nothing written on the server.
import type { CardOrigin, Flashcard } from '~/types'
import type { RatingFeedback } from '~/components/review/ReviewFeedback.vue'
import { Flame } from 'lucide-vue-next'
import celebratingAvif from '~/assets/mascots/mascot-baigi-celebrating.avif'
import celebratingWebp from '~/assets/mascots/mascot-baigi-celebrating.webp'
import {
  GUEST_GOALS, guestSummary, isGuestArea, loadGuestProgress, nextGuestCard, returnText, saveGuestProgress,
  type GuestArea, type GuestDeck, type GuestGoal, type GuestProgress, type GuestRating,
} from '~/utils/guestProgress'
import { feedbackTitle, feedbackWhen } from '~/utils/reviewFeedback'
import { binaryRatingOfKey, reviewKeysHint } from '~/utils/reviewButtons'
import { REVIEW_BATCH, cardsMinutes } from '~/utils/reviewBatch'

definePageMeta({ layout: false, chrome: 'focus' })

const route = useRoute()
const auth = useAuthStore()
const { $api } = useNuxtApp()
const { track } = useAnalytics()

const param = String(route.params.area)
if (!isGuestArea(param)) throw createError({ statusCode: 404, statusMessage: 'Página não encontrada', fatal: true })
const area: GuestArea = param

const deck = ref<GuestDeck | null>(null)
const progress = ref<GuestProgress | null>(null)
const phase = ref<'loading' | 'error' | 'review' | 'result' | 'commit'>('loading')
const current = ref<number | null>(null)
const flipped = ref(false)
const announcement = ref('')
const feedback = ref<RatingFeedback | null>(null)
let feedbackId = 0
const band = ref<{ cancel: (via: 'tap' | 'key' | 'why') => void } | null>(null)
const commitTitle = ref<HTMLElement | null>(null)

useHead(() => ({ title: deck.value ? `Exemplo de ${deck.value.name} · Baigi` : 'Começar · Baigi' }))

const indices = computed(() => deck.value?.cards.map(c => c.index) ?? [])
const card = computed(() => deck.value?.cards.find(c => c.index === current.value) ?? null)
const currentCard = computed(() => ({ id: `guest-${current.value}`, type: 'basic', front: card.value?.front ?? '', back: card.value?.back ?? '' }) as unknown as Flashcard)
const currentOrigin = computed<CardOrigin>(() => ({ kind: 'note', note_id: '', topic_id: null, title: `${deck.value?.note_title ?? ''}${card.value?.source ? ` · ${card.value.source}` : ''}` }))
const reviews = computed(() => progress.value?.reviews ?? [])
const isRepeat = computed(() => current.value !== null && reviews.value.some(r => r.index === current.value))
const seen = computed(() => new Set(reviews.value.map(r => r.index)).size)
const batch = computed(() => {
  const size = indices.value.length
  const position = Math.min(isRepeat.value ? size : seen.value + 1, size)
  return { index: 1, total: 1, card: position, size, done: size ? seen.value / size : 0 }
})
/** A card that came back after "Não lembrei": "Lembrei" now returns sooner (the FSRS's relearned interval) */
const ratingIntervals = computed(() => (isRepeat.value && deck.value?.relearned_interval ? { ...deck.value.intervals, good: deck.value.relearned_interval } : deck.value!.intervals))
const summary = computed(() => (deck.value && progress.value ? guestSummary(progress.value.reviews, deck.value.intervals, deck.value.relearned_interval) : null))

// === The commitment (RF-F9) ===
const EXAM_OPTIONS = [
  { value: 'date', label: 'Tenho data', description: 'O Hoje conta os dias até ela.' },
  { value: 'none', label: 'Ainda não', description: 'Dá para marcar depois, em Progresso.' },
]
const goalOptions = GUEST_GOALS.map(n => ({
  value: String(n),
  label: n === 1 ? '1 lote' : `${n} lotes`,
  description: `uns ${cardsMinutes(n * REVIEW_BATCH)} min por dia${n === 1 ? ' · para começar' : ''}`,
}))
const examChoice = ref<'date' | 'none'>('none')
const examDate = ref('')
const examError = ref('')
const goalChoice = ref('1')
const tomorrow = computed(() => {
  const [y, m, d] = studyDay().split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + 1)).toISOString().slice(0, 10)
})

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
  if (progress.value.goal_batches) goalChoice.value = String(progress.value.goal_batches)
  if (progress.value.exam_date) {
    examChoice.value = 'date'
    examDate.value = progress.value.exam_date
  }
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
  announcement.value = 'Resposta à mostra. 1 não lembrei, 2 lembrei.'
}

function rate(rating: GuestRating) {
  if (!flipped.value || current.value === null || !progress.value || !deck.value) return
  const pass = reviews.value.filter(r => r.index === current.value).length + 1
  const forgotBefore = reviews.value.some(r => r.index === current.value && r.rating === 1)
  progress.value.reviews.push({ index: current.value, rating, reviewed_at: new Date().toISOString() })
  saveGuestProgress(progress.value)
  track('guest_card_rated', { area, index: current.value, rating, pass })
  // The answer band (prd-visual-e2 Fase 2b): the card stays with its answer until "Continuar" (a hit: 1.2 s by itself).
  // No "Por quê?": the explanation is AI and asks for an account; the band of a miss says where the card goes.
  const kind = rating === 1 ? 'again' : 'ok'
  feedback.value = {
    id: ++feedbackId,
    kind,
    title: feedbackTitle(kind, `guest-${area}-${current.value}`),
    when: rating === 1 ? 'Ele volta no fim do lote.' : feedbackWhen('ok', forgotBefore && deck.value.relearned_interval ? deck.value.relearned_interval : deck.value.intervals.good),
    autoAdvance: rating !== 1,
    canWhy: false,
  }
}

function continueAfterBand() {
  if (!feedback.value) return
  feedback.value = null
  advance()
}

function finish() {
  if (!progress.value || !deck.value) return
  progress.value.done = true
  saveGuestProgress(progress.value)
  const s = guestSummary(progress.value.reviews, deck.value.intervals, deck.value.relearned_interval)
  track('guest_batch_done', { area, remembered: s.remembered, total: s.total, repeats: s.repeated })
  showResult()
}

function showResult() {
  feedback.value = null
  phase.value = 'result'
  focusWhenReady('[data-testid=guest-result] [data-celebration-title]')
}

/** The result's title comes in a lazy chunk: focus it as soon as it is on the page (a few frames, at most ~2 s). */
function focusWhenReady(selector: string, tries = 120) {
  const el = document.querySelector<HTMLElement>(selector)
  if (el) return el.focus()
  if (tries > 0) requestAnimationFrame(() => focusWhenReady(selector, tries - 1))
}

function openCommit() {
  phase.value = 'commit'
  void nextTick(() => commitTitle.value?.focus())
}

/** Keeps the answers with the lote (the account applies them at /comecar/pronto), then goes on. */
function commitAndGo(to: string) {
  if (!progress.value) return
  examError.value = ''
  if (examChoice.value === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate.value) || examDate.value < tomorrow.value) {
      examError.value = 'Escolha uma data a partir de amanhã, ou marque “Ainda não”.'
      return
    }
  }
  progress.value.goal_batches = Number(goalChoice.value) as GuestGoal
  progress.value.exam_date = examChoice.value === 'date' ? examDate.value : null
  saveGuestProgress(progress.value)
  track('guest_commitment', { area, goal_batches: progress.value.goal_batches, has_exam: examChoice.value === 'date' })
  void navigateTo(to)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Space/Enter turns the card; with the answer, 1 / ← "Não lembrei" and 2 / → / Space "Lembrei" (the session's binary keys).
// With the band: Enter/Space go on, any other key only stops the 1.2 s (and never rates the card behind it)
function onKeydown(e: KeyboardEvent) {
  if (phase.value !== 'review' || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (feedback.value) {
    if ((e.key === ' ' || e.key === 'Enter') && !target?.closest('a, button')) {
      e.preventDefault()
      continueAfterBand()
    } else if (!['Shift', 'Tab', 'Enter', ' '].includes(e.key)) {
      if (binaryRatingOfKey(e.key) !== null) e.preventDefault()
      band.value?.cancel('key')
    }
    return
  }
  if ((e.key === ' ' || e.key === 'Enter') && target?.closest('a, button:not([data-review-card])')) return
  if (!flipped.value) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      flip()
    }
    return
  }
  const rating = binaryRatingOfKey(e.key)
  if (rating !== null) {
    e.preventDefault()
    rate(rating)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  if (route.query.from === 'landing') track('onboarding_area_chosen', { area, source: 'landing' })
  void load()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.guest-mascot img { display: block; width: 104px; height: 104px; object-fit: contain; }
@media (prefers-reduced-motion: no-preference) {
  .guest-mascot { animation: guest-rise 520ms var(--ease-out) both; }
  .guest-chip { animation: guest-pop 360ms var(--ease-out) 760ms both; }
}
@keyframes guest-rise { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes guest-pop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: none; } }
</style>
