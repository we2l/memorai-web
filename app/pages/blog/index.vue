<template>
  <div class="mx-auto max-w-page px-gutter pt-8 lg:pt-12">
    <header class="max-w-prose">
      <h1 class="mb-3 text-page-title-sm text-fg-strong sm:text-page-title">Blog do Baigi</h1>
      <p class="text-body text-fg">
        Como estudar e lembrar na prova: repetição espaçada, revisão e métodos, sempre com a fonte para você conferir.
      </p>
    </header>

    <nav v-if="categories.length > 1" aria-label="Categorias" class="mt-6 flex flex-wrap gap-2">
      <UiLink v-for="c in categories" :key="c" :href="`#${c}`" variant="muted" standalone class="rounded-control border border-line px-3 text-meta">
        {{ categoryLabel(c) }}
      </UiLink>
    </nav>

    <section v-for="c in categories" :id="c" :key="c" class="mt-10 scroll-mt-6" :aria-labelledby="`h-${c}`">
      <h2 :id="`h-${c}`" class="mb-4 text-section text-fg-strong">{{ categoryLabel(c) }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BlogArticleCard v-for="a in byCategory(c)" :key="a.slug" :article="a" />
      </div>
    </section>

    <section class="mt-12" aria-labelledby="h-ferramentas">
      <h2 id="h-ferramentas" class="mb-4 text-section text-fg-strong">Ferramentas grátis</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiListRow v-for="t in TOOLS" :key="t.path" :to="t.path" :title="t.title" :meta="t.description" class="rounded-card bg-raised shadow-card" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// /blog (prd-blog-seo RF-B6): prerendered list by category + the tools
import { articles } from '#blog/index'
import type { BlogCategory } from '~~/modules/blog/types'
import { BLOG_TOOL_PAGES as TOOLS, breadcrumbJsonLd, categoryLabel } from '~/utils/blog'

definePageMeta({ layout: 'public' })

const ORDER: BlogCategory[] = ['metodo', 'concurso', 'enem', 'oab', 'medicina', 'idiomas', 'comparacao']
const categories = ORDER.filter(c => articles.some(a => a.category === c))
const byCategory = (c: BlogCategory) => articles.filter(a => a.category === c)

useBlogSeo({
  title: 'Blog do Baigi: como estudar e lembrar na prova',
  description: 'Repetição espaçada, revisão para concurso, ENEM, OAB, medicina e inglês, e comparações honestas entre apps de flashcards. Com fontes.',
  path: '/blog',
  jsonLd: [breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }])],
})
</script>
