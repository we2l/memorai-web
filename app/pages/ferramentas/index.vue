<template>
  <div class="mx-auto max-w-article px-gutter pt-8 lg:pt-12">
    <h1 class="mb-3 text-page-title text-fg-strong">Ferramentas grátis para estudar</h1>
    <p class="mb-8 text-body text-fg">Contas que ajudam a decidir quando revisar. Rodam no seu navegador, sem cadastro.</p>
    <div class="grid gap-4">
      <UiListRow v-for="t in BLOG_TOOL_PAGES" :key="t.path" :to="t.path" :title="t.title" :meta="t.description" class="rounded-card bg-raised shadow-1" />
    </div>
    <p class="mt-8 text-meta text-fg-muted">
      Quer entender a conta? Leia <UiLink to="/blog" variant="action">o blog</UiLink>, onde explicamos a curva do esquecimento e a repetição espaçada.
    </p>
  </div>
</template>

<script setup lang="ts">
// /ferramentas (prd-blog-seo RF-T3)
import { BLOG_TOOL_PAGES, breadcrumbJsonLd } from '~/utils/blog'

definePageMeta({ layout: 'public' })

useBlogSeo({
  title: 'Ferramentas grátis para estudar',
  description: 'Calculadora do esquecimento e plano até a prova: veja quanto você ainda lembra e quanto revisar por dia até a prova. Grátis, sem cadastro.',
  path: '/ferramentas',
  jsonLd: [breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Ferramentas', path: '/ferramentas' }])],
})
</script>
