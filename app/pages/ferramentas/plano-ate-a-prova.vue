<template>
  <div class="mx-auto max-w-prose px-gutter pt-8 lg:pt-12">
    <nav aria-label="Caminho" class="mb-4 text-meta text-fg-muted">
      <UiLink to="/ferramentas" variant="muted">Ferramentas</UiLink>
    </nav>
    <h1 class="mb-3 text-page-title-sm text-fg-strong sm:text-page-title">Plano até a prova</h1>
    <p class="mb-8 text-body text-fg">
      Com a data da prova e quantos cards você quer dominar, o plano mostra quantos cards novos e quantas revisões cabem por dia,
      e quanto você deve lembrar no dia da prova se mantiver o ritmo.
    </p>

    <BlogExamPlanner :area="area" />

    <section class="blog-prose mt-10" aria-labelledby="h-como">
      <h2 id="h-como">Como o plano é calculado</h2>
      <p>
        Os cards novos são divididos igualmente pelos dias até a prova, menos os 3 últimos, que ficam só para revisão. Cada card volta
        quando a chance de lembrar dele chega a 90%, pela conta do FSRS-6 com os parâmetros padrão.
      </p>
      <p>
        Como ninguém acerta tudo, o plano soma 10% de revisões para os cards esquecidos. Os minutos contam 8 segundos por card, um ritmo
        comum em flashcards curtos; cards longos levam mais.
      </p>
      <p>
        A lembrança no dia da prova é a média da chance de lembrar de cada card naquele dia. Para entender a curva por trás da conta,
        leia <NuxtLink to="/blog/curva-do-esquecimento">curva do esquecimento</NuxtLink>.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// /ferramentas/plano-ate-a-prova (prd-blog-seo RF-T2); ?area= as in the calculator
import { breadcrumbJsonLd, toolJsonLd } from '~/utils/blog'
import '~/assets/css/blog-prose.css'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const area = useAreaQuery()

const DESCRIPTION = 'Coloque a data da prova e o volume: veja quantos cards novos e quantas revisões por dia você precisa, e quanto deve lembrar no dia. Grátis.'
useBlogSeo({
  title: 'Plano até a prova: quanto revisar por dia',
  description: DESCRIPTION,
  path: '/ferramentas/plano-ate-a-prova',
  jsonLd: [
    toolJsonLd('Plano até a prova', DESCRIPTION, '/ferramentas/plano-ate-a-prova'),
    breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }, { name: 'Plano até a prova', path: '/ferramentas/plano-ate-a-prova' }]),
  ],
})
</script>
