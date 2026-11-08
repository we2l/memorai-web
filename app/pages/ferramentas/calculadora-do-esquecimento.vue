<template>
  <div class="mx-auto max-w-prose px-gutter pt-8 lg:pt-12">
    <nav aria-label="Caminho" class="mb-4 text-meta text-fg-muted">
      <UiLink to="/ferramentas" variant="muted">Ferramentas</UiLink>
    </nav>
    <h1 class="mb-3 text-page-title-sm text-fg-strong sm:text-page-title">Calculadora do esquecimento</h1>
    <p class="mb-8 text-body text-fg">
      Diga há quantos dias você estudou e quantas vezes já se testou. A calculadora estima quanto você ainda deve lembrar
      e em que dia vale revisar, pela mesma conta que o Baigi usa para agendar as revisões.
    </p>

    <BlogForgettingCalculator :area="area" />

    <section class="blog-prose mt-10" aria-labelledby="h-como">
      <h2 id="h-como">Como a conta funciona</h2>
      <p>
        A estimativa usa o FSRS-6, um algoritmo de repetição espaçada de código aberto, também usado pelo Anki. Ele prevê a chance de
        você lembrar de um card a partir da <strong>estabilidade</strong>: o número de dias até essa chance cair para 90%.
      </p>
      <p>
        Um card novo que você acerta na primeira vez começa com estabilidade de cerca de 2,3 dias. Cada revisão feita no momento certo,
        e acertada, aumenta essa estabilidade, e por isso a curva fica mais plana a cada revisão.
      </p>
      <p>
        Os números valem para lembrar <em>testando a memória</em>, como num flashcard. Só reler costuma deixar uma lembrança mais fraca.
        A explicação completa, com as fontes, está em <NuxtLink to="/blog/curva-do-esquecimento">curva do esquecimento</NuxtLink>.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// /ferramentas/calculadora-do-esquecimento (prd-blog-seo RF-T1). ?area= (from an article or a video) picks the
// mini-lote of the call; it is read after hydration (the prerendered page has no query).
import { BLOG_AREAS, type BlogArea } from '~~/modules/blog/types'
import { breadcrumbJsonLd, toolJsonLd } from '~/utils/blog'
import '~/assets/css/blog-prose.css'

definePageMeta({ layout: 'public' })

const area = ref<BlogArea | null>(null)
onMounted(() => {
  const q = new URLSearchParams(window.location.search).get('area')
  if (q && (BLOG_AREAS as readonly string[]).includes(q)) area.value = q as BlogArea
})

const TITLE = 'Calculadora do esquecimento: quanto você ainda lembra'
const DESCRIPTION = 'Estudou há alguns dias? Veja quanto ainda deve lembrar e quando revisar, pelo modelo FSRS de repetição espaçada. Grátis e sem cadastro.'
useBlogSeo({
  title: TITLE,
  description: DESCRIPTION,
  path: '/ferramentas/calculadora-do-esquecimento',
  jsonLd: [
    toolJsonLd('Calculadora do esquecimento', DESCRIPTION, '/ferramentas/calculadora-do-esquecimento'),
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }, { name: 'Calculadora do esquecimento', path: '/ferramentas/calculadora-do-esquecimento' }]),
  ],
})
</script>
