<template>
  <div class="mx-auto max-w-page px-gutter pt-8 lg:pt-12">
    <header class="flex items-center justify-between gap-8">
      <div class="max-w-article">
        <h1 class="mb-3 text-display text-fg-strong">Blog do Baigi</h1>
        <p class="blog-lead text-fg-muted">
          Como estudar e lembrar no dia da prova: repetição espaçada, revisão e planos por prova, sempre com a fonte para você conferir.
        </p>
      </div>
      <UiBaigiMascot :size="168" state="idle" priority class="hidden shrink-0 lg:block" />
    </header>

    <!-- Links to the #category: without JS they jump to its list in "Por assunto"; with JS they filter the grid in place -->
    <nav aria-label="Categorias" class="blog-filter-scroll mt-8 overflow-x-auto pb-1">
      <ul class="inline-flex gap-1 rounded-chip bg-soft p-1">
        <li v-for="f in filters" :key="f.id">
          <a
            :href="f.id ? `#${f.id}` : '#'"
            class="blog-filter-link inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-chip px-4 text-meta"
            :class="selected === f.id ? 'bg-raised font-semibold text-fg-strong shadow-1' : 'text-fg hover:text-fg-strong'"
            :aria-current="selected === f.id ? 'true' : undefined"
            :data-testid="`blog-filter-${f.id || 'all'}`"
            @click.prevent="choose(f.id)"
          >
            {{ f.label }} <span class="text-label text-fg-muted">{{ f.count }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <BlogFeatured v-if="!selected && featured" :article="featured" class="mt-8" />

    <section class="mt-12" aria-labelledby="h-recentes">
      <h2 id="h-recentes" class="mb-5 text-section text-fg-strong">{{ selected ? categoryLabel(selected) : 'Mais recentes' }}</h2>
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" data-testid="blog-grid">
        <BlogArticleCard v-for="a in grid" :key="a.slug" :article="a" />
      </div>
    </section>

    <section class="mt-12" aria-labelledby="h-ferramentas">
      <h2 id="h-ferramentas" class="mb-5 text-section text-fg-strong">Ferramentas grátis</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <UiListRow v-for="t in TOOLS" :key="t.path" :to="t.path" :title="t.title" :meta="t.description" class="rounded-card bg-raised shadow-1" />
      </div>
    </section>

    <section class="mt-12" aria-labelledby="h-assunto">
      <h2 id="h-assunto" class="mb-5 text-section text-fg-strong">Por assunto</h2>
      <div class="grid gap-8 md:grid-cols-2">
        <div v-for="c in categories" :id="c" :key="c" class="scroll-mt-6">
          <h3 class="mb-2"><BlogCategoryLabel :category="c" /></h3>
          <ul>
            <li v-for="a in byCategory(c)" :key="a.slug" class="border-b border-line">
              <NuxtLink :to="`/blog/${a.slug}`" class="blog-title-link flex min-h-touch items-baseline justify-between gap-4 py-3 text-body text-fg-strong">
                <span>{{ a.title }}</span>
                <span class="shrink-0 text-meta text-fg-muted">{{ a.readingMinutes }} min</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p class="mt-12 text-meta text-fg-muted">
      Os artigos são assinados pelo Baigi. <UiLink to="/blog/sobre" variant="muted" class="underline">Como eles são feitos</UiLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
// /blog (prd-blog-seo RF-B6, prd-blog-v2 RF-V1): prerendered. The title with the dolphin, the segmented filter with the
// count of each category (#categoria in the URL), the highlight (featured or newest), the grid with each article's
// cover number, the tools and the list by subject. Calm: gray covers, the category's color only in the dot, the one
// purple is "Ler o guia".
import { articles } from '#blog/index'
import '~/assets/css/blog-prose.css'
import type { BlogCategory } from '~~/modules/blog/types'
import { BLOG_TOOL_PAGES as TOOLS, breadcrumbJsonLd, categoryLabel, featuredArticle } from '~/utils/blog'

definePageMeta({ layout: 'public', quietHeaderCta: true })

const ORDER: BlogCategory[] = ['concurso', 'oab', 'metodo', 'enem', 'medicina', 'idiomas', 'comparacao']
const categories = ORDER.filter(c => articles.some(a => a.category === c))
const byCategory = (c: BlogCategory) => articles.filter(a => a.category === c)
const featured = featuredArticle(articles)

const filters = [
  { id: '' as const, label: 'Tudo', count: articles.length },
  ...categories.map(c => ({ id: c, label: categoryLabel(c), count: byCategory(c).length })),
]

/** The chosen category ('' = all); read from the #hash after the prerendered page mounts */
const selected = ref<BlogCategory | ''>('')
const grid = computed(() => (selected.value ? byCategory(selected.value) : articles.filter(a => a !== featured)))

function choose(id: BlogCategory | '') {
  selected.value = id
  // Keeps the choice in the URL without scrolling to the list of the category (that is the no-JS path)
  history.replaceState(history.state, '', id ? `#${id}` : location.pathname + location.search)
}

onMounted(() => {
  const hash = location.hash.slice(1) as BlogCategory
  if (categories.includes(hash)) selected.value = hash
})

useBlogSeo({
  title: 'Blog do Baigi: como estudar e lembrar na prova',
  description: 'Repetição espaçada, revisão para concurso, ENEM, OAB, medicina e inglês, e comparações honestas entre apps de flashcards. Com fontes.',
  path: '/blog',
  jsonLd: [breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }])],
})
</script>
