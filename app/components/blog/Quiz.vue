<template>
  <section ref="root" class="rounded-card border border-line bg-raised p-5 shadow-card sm:p-6" :aria-labelledby="titleId" data-testid="blog-quiz">
    <h2 :id="titleId" class="mb-1 text-section text-fg-strong">{{ title || 'Teste rápido: você lembra?' }}</h2>
    <p class="mb-5 text-meta text-fg-muted">
      Tente responder de cabeça antes de ver a resposta. É assim que a revisão funciona.
    </p>

    <div v-if="!done" aria-live="polite">
      <p class="mb-2 text-label text-fg-muted">Card {{ index + 1 }} de {{ cards.length }}</p>
      <p class="mb-4 text-body font-semibold text-fg-strong" data-testid="blog-quiz-question">{{ current.q }}</p>
      <div v-if="revealed" class="mb-5 rounded-row bg-subtle px-4 py-3" data-testid="blog-quiz-answer">
        <p class="text-body text-fg">{{ current.a }}</p>
        <p v-if="current.source" class="mt-1 text-meta text-fg-muted">Fonte: {{ current.source }}</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <UiButton v-if="!revealed" data-testid="blog-quiz-reveal" @click="reveal">Mostrar resposta</UiButton>
        <template v-else>
          <UiButton data-testid="blog-quiz-forgot" @click="rate(false)">Não lembrei</UiButton>
          <UiButton data-testid="blog-quiz-remembered" @click="rate(true)">Lembrei</UiButton>
        </template>
      </div>
    </div>

    <div v-else aria-live="polite" data-testid="blog-quiz-result">
      <p class="mb-2 text-body text-fg-strong">
        Você lembrou de <strong>{{ remembered }} de {{ cards.length }}</strong>.
      </p>
      <p class="mb-5 text-body text-fg">
        {{ remembered === cards.length
          ? 'Ótimo. O que decide é lembrar daqui a um mês, e para isso cada card precisa voltar no dia certo.'
          : 'Os que você esqueceu são exatamente os que precisam voltar primeiro. Numa revisão espaçada, eles voltam antes dos outros.' }}
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <UiButton variant="primary" :href="ctaHref" data-testid="blog-quiz-cta" @click="onCta">
          Continuar com 6 cards de {{ AREA_LABEL[area] }}
        </UiButton>
        <UiButton variant="ghost" @click="restart">Refazer</UiButton>
      </div>
      <p class="mt-3 text-meta text-fg-muted">Sem conta e sem cartão. Você revisa 6 cards prontos e só cria a conta se quiser guardar.</p>
    </div>

    <details class="mt-6 border-t border-line pt-4">
      <summary class="flex min-h-touch cursor-pointer items-center text-meta font-semibold text-fg-strong">Ver todas as perguntas e respostas</summary>
      <ol class="mt-2 flex list-decimal flex-col gap-3 pl-5 text-meta text-fg">
        <li v-for="(c, i) in cards" :key="i">
          <p class="font-semibold text-fg-strong">{{ c.q }}</p>
          <p>{{ c.a }}<template v-if="c.source"> ({{ c.source }})</template></p>
        </li>
      </ol>
    </details>
  </section>
</template>

<script setup lang="ts">
// Quiz of 3 to 6 cards inside an article (prd-blog-seo RF-B9, blog-referencias §4): try to recall, then the answer
// always shows (feedback, revisao-melhor-forma §4.3), then "Lembrei / Não lembrei". The end leads to the visitor's
// mini-lote of the area. Nothing is saved; the full list stays in the HTML for readers without JS and for search.
import type { BlogArea, QuizCard } from '~~/modules/blog/types'
import { AREA_LABEL, blogStartPath } from '~/utils/blog'

const props = defineProps<{ slug: string, area: BlogArea, title?: string, cards: QuizCard[] }>()

const titleId = useId()
const index = ref(0)
const revealed = ref(false)
const results = ref<boolean[]>([])
const done = computed(() => results.value.length === props.cards.length)
const current = computed(() => props.cards[index.value]!)
const remembered = computed(() => results.value.filter(Boolean).length)
const ctaHref = computed(() => blogStartPath(props.area, props.slug, 'quiz'))

const { track } = useAnalytics()
const root = ref<HTMLElement | null>(null)

/** The button that had the focus disappears: keyboard users go on from the first rating */
async function reveal() {
  revealed.value = true
  await nextTick()
  root.value?.querySelector<HTMLElement>('[data-testid="blog-quiz-forgot"]')?.focus()
}

async function rate(ok: boolean) {
  results.value = [...results.value, ok]
  revealed.value = false
  if (done.value) track('blog_quiz_answered', { slug: props.slug, remembered: remembered.value, total: props.cards.length })
  else index.value++
  await nextTick()
  root.value?.querySelector<HTMLElement>(done.value ? '[data-testid="blog-quiz-cta"]' : '[data-testid="blog-quiz-reveal"]')?.focus()
}

function restart() {
  results.value = []
  index.value = 0
  revealed.value = false
}

function onCta() {
  track('blog_cta_clicked', { slug: props.slug, position: 'quiz', area: props.area })
}
</script>
