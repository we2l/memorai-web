<template>
  <div>
    <section
      ref="root"
      class="rounded-card border border-line bg-subtle p-4 outline-none sm:p-6"
      tabindex="-1"
      :aria-labelledby="titleId"
      aria-keyshortcuts="Space 1 2"
      data-testid="blog-quiz"
      @keydown="onKey"
    >
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h2 :id="titleId" class="text-meta font-semibold text-fg-strong">{{ title || 'Teste rápido: você lembra?' }}</h2>
        <p v-if="!done" class="shrink-0 text-meta text-fg-muted" data-testid="blog-quiz-count">{{ index + 1 }} de {{ cards.length }}</p>
      </div>
      <UiProgressBar :value="results.length" :max="cards.length" :segments="cards.length" label="Progresso do teste" :value-text="`${results.length} de ${cards.length}`" class="mb-4" />

      <div v-if="!done">
        <div class="mb-3 flex min-h-7 items-center" aria-live="polite">
          <p
            v-if="feedback"
            :key="feedback.id"
            class="feedback-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-meta font-semibold"
            :class="feedback.remembered ? 'bg-success-subtle text-success' : 'bg-raised text-fg'"
            data-testid="blog-quiz-feedback"
          >
            <component :is="feedback.remembered ? Check : RotateCcw" class="size-4 shrink-0" aria-hidden="true" />
            {{ feedback.text }}
          </p>
          <p v-else class="text-meta text-fg-muted">Tente responder de cabeça antes de ver a resposta.</p>
        </div>

        <div
          ref="card"
          class="flex min-h-48 flex-col gap-4 rounded-card bg-raised p-6 shadow-card outline-none sm:min-h-60 sm:p-8"
          tabindex="-1"
          data-testid="blog-quiz-card"
        >
          <p class="break-words text-section text-fg-strong" data-testid="blog-quiz-question">{{ current.q }}</p>
          <div v-if="revealed" class="answer-in flex flex-col gap-2 border-t border-line pt-4" data-testid="blog-quiz-answer">
            <p class="break-words text-body text-fg">{{ current.a }}</p>
            <p v-if="current.source" class="text-meta text-fg-muted">Fonte: {{ current.source }}</p>
          </div>
        </div>

        <div class="mt-4">
          <UiButton v-if="!revealed" variant="primary" block data-testid="blog-quiz-reveal" aria-keyshortcuts="Space" @click="reveal">
            Mostrar resposta
            <kbd class="ml-2 hidden rounded-tag border border-on-action/40 px-1 font-sans text-label pointer-fine:inline" aria-hidden="true">Espaço</kbd>
          </UiButton>
          <!-- The two ratings of the review v5 (ReviewRatings mode "two" of the Fase A): same look and tokens -->
          <div v-else role="group" aria-label="Como foi" class="grid grid-cols-2 gap-2">
            <button
              v-for="r in RATINGS"
              :key="r.key"
              type="button"
              class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-2 text-body font-semibold transition-colors duration-nav"
              :class="r.primary ? 'bg-action text-on-action shadow-press hover:bg-action-hover active:translate-y-0.5 active:shadow-press-active' : 'border border-line-strong bg-raised text-fg-strong hover:bg-subtle'"
              :aria-keyshortcuts="r.key"
              :aria-label="`${r.label}, ${r.returns} (${r.key})`"
              :data-testid="r.testid"
              @click="rate(r.remembered)"
            >
              <span class="flex items-center gap-1.5">
                <kbd class="hidden rounded-tag border px-1 font-sans text-label pointer-fine:inline" :class="r.primary ? 'border-on-action/40' : 'border-line-strong text-fg-muted'" aria-hidden="true">{{ r.key }}</kbd>
                {{ r.label }}
              </span>
              <span class="text-label font-normal" :class="r.primary ? 'text-on-action' : 'text-fg-muted'" aria-hidden="true">{{ r.returns }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else aria-live="polite" data-testid="blog-quiz-result">
        <p class="mb-1 text-label text-fg-muted">Resultado</p>
        <p class="mb-3 text-page-title-sm text-fg-strong">Você lembrou {{ remembered }} de {{ cards.length }}</p>
        <p class="mb-5 text-body text-fg">{{ endSentence }}</p>
        <UiButton variant="primary" block :href="ctaHref" data-testid="blog-quiz-cta" @click="onCta">
          Revisar 6 cards de {{ AREA_LABEL[area] }} sem criar conta
        </UiButton>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-meta text-fg-muted">Sem cartão. Você só cria a conta se quiser guardar.</p>
          <UiButton variant="ghost" size="sm" @click="restart">Refazer o teste</UiButton>
        </div>
      </div>
    </section>

    <!-- Outside the exercise, after it: the full list stays in the HTML for readers without JS and for search -->
    <details class="mt-2 px-1 text-meta text-fg-muted">
      <summary class="inline-flex min-h-touch cursor-pointer items-center">Perguntas e respostas deste teste</summary>
      <ol class="mt-1 flex list-decimal flex-col gap-2 pb-2 pl-5">
        <li v-for="(c, i) in cards" :key="i">
          <span class="font-semibold text-fg">{{ c.q }}</span> {{ c.a }}<template v-if="c.source"> ({{ c.source }})</template>
        </li>
      </ol>
    </details>
  </div>
</template>

<script setup lang="ts">
// Quiz inside an article (prd-blog-seo RF-B9, owner's review of 08/11): looks and works like the app's review v5 —
// big front, "Mostrar resposta" as the primary, then "Não lembrei / Lembrei" with where the card would go, a feedback
// pill after each rating and the segmented progress. Keys (focus inside the quiz only): Espaço shows, 1 = Não lembrei,
// 2 = Lembrei. The end leads to the visitor's mini-lote of the area. Nothing is saved.
import { Check, RotateCcw } from 'lucide-vue-next'
import type { BlogArea, QuizCard } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'
import { FIRST_STABILITY, intervalFor } from '~/utils/forgetting'

const props = defineProps<{ slug: string, area: BlogArea, title?: string, cards: QuizCard[] }>()

/** Where a new card goes in the FSRS-6 defaults: "Lembrei" (Good) → R reaches 90% in ~2 days; "Não lembrei" → today */
const GOOD_DAYS = Math.round(intervalFor(FIRST_STABILITY, 0.9))
const GOOD_TEXT = `volta em ${GOOD_DAYS} ${GOOD_DAYS === 1 ? 'dia' : 'dias'}`
const AGAIN_TEXT = 'volta ainda hoje'
const RATINGS = [
  { key: '1', label: 'Não lembrei', returns: AGAIN_TEXT, remembered: false, primary: false, testid: 'blog-quiz-forgot' },
  { key: '2', label: 'Lembrei', returns: GOOD_TEXT, remembered: true, primary: true, testid: 'blog-quiz-remembered' },
] as const

const titleId = useId()
const root = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)
const index = ref(0)
const revealed = ref(false)
const results = ref<boolean[]>([])
const feedback = ref<{ id: number, remembered: boolean, text: string } | null>(null)
const done = computed(() => results.value.length === props.cards.length)
const current = computed(() => props.cards[index.value]!)
const remembered = computed(() => results.value.filter(Boolean).length)
const ctaHref = computed(() => blogStartPath(props.area, props.slug, 'quiz'))

const endSentence = computed(() => {
  const r = remembered.value
  const f = props.cards.length - r
  if (f === 0) return `No Baigi, esses ${r} cards voltariam em ${GOOD_DAYS} dias, perto da hora em que você começaria a esquecer.`
  if (r === 0) return `No Baigi, os ${f} cards voltariam ainda hoje, até você lembrar, e depois em intervalos cada vez maiores.`
  return `No Baigi, ${r === 1 ? 'o que você lembrou voltaria' : `os ${r} que você lembrou voltariam`} em ${GOOD_DAYS} dias, e ${f === 1 ? 'o que você esqueceu' : `os ${f} que esqueceu`}, ainda hoje.`
})

const { track } = useAnalytics()

async function reveal() {
  if (revealed.value || done.value) return
  if (index.value === 0 && results.value.length === 0) track('blog_quiz_started', { slug: props.slug, area: props.area })
  revealed.value = true
  // The focused button disappears: keep the focus in the quiz (1/2 or Tab to the ratings)
  await nextTick()
  card.value?.focus()
}

async function rate(ok: boolean) {
  if (!revealed.value || done.value) return
  results.value = [...results.value, ok]
  feedback.value = { id: results.value.length, remembered: ok, text: ok ? `Lembrei · ${GOOD_TEXT}` : `Não lembrei · ${AGAIN_TEXT}` }
  revealed.value = false
  if (done.value) track('blog_quiz_done', { slug: props.slug, remembered: remembered.value, total: props.cards.length })
  else index.value++
  await nextTick()
  root.value?.querySelector<HTMLElement>(done.value ? '[data-testid="blog-quiz-cta"]' : '[data-testid="blog-quiz-reveal"]')?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  const onControl = e.target instanceof HTMLElement && !!e.target.closest('button, a, summary')
  if (e.key === ' ' && !revealed.value && !done.value && !onControl) {
    e.preventDefault()
    reveal()
  } else if ((e.key === '1' || e.key === '2') && revealed.value) {
    e.preventDefault()
    rate(e.key === '2')
  }
}

function restart() {
  results.value = []
  index.value = 0
  revealed.value = false
  feedback.value = null
}

function onCta() {
  track('blog_quiz_cta_clicked', { slug: props.slug, area: props.area })
}
</script>

<style scoped>
/* The answer and the feedback arrive in --motion-respond, like the review; prefers-reduced-motion: they just appear */
@media (prefers-reduced-motion: no-preference) {
  .answer-in { animation: quiz-in var(--motion-respond) var(--ease-calm) both; }
  .feedback-in { animation: quiz-in var(--motion-respond) var(--ease-calm) both; }
}
@keyframes quiz-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
</style>
