<template>
  <!-- One column below 1024 px (header, cover, collapsible contents, text). From 1024 px: the text column (max-w-article,
       ~70 characters a line) on the left, and on the right the cover and the sticky table of contents (prd-blog-v2) -->
  <article v-if="article" class="mx-auto max-w-page px-gutter pt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-12 lg:pt-10 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-x-20" data-testid="blog-article">
    <header class="mx-auto max-w-article lg:col-start-1 lg:row-start-1 lg:mx-0">
      <nav aria-label="Caminho" class="mb-5 text-meta text-fg-muted">
        <ol class="flex flex-wrap gap-1">
          <li><UiLink to="/blog" variant="muted">Blog</UiLink> ›</li>
          <li><UiLink :to="`/blog#${article.category}`" variant="muted">{{ categoryLabel(article.category) }}</UiLink></li>
        </ol>
      </nav>

      <BlogCategoryLabel :category="article.category" :extra="article.context ? [article.context] : []" class="mb-3" />
      <h1 class="mb-5 text-display text-fg-strong">{{ article.title }}</h1>
      <p v-if="article.summary" class="blog-lead mb-6 border-l-4 border-fg-strong pl-4 text-fg-strong sm:pl-5" data-testid="blog-summary">{{ article.summary }}</p>

      <div class="mb-6 flex items-center gap-3" data-testid="blog-byline">
        <BlogAuthorMark :author="author" />
        <p class="text-meta text-fg-muted">
          <span class="block text-fg">Por <UiLink :to="author.page" variant="action" class="font-semibold">{{ author.name }}</UiLink></span>
          Atualizado em <time :datetime="article.updated">{{ formatBlogDate(article.updated) }}</time> · {{ article.readingMinutes }} min de leitura
        </p>
      </div>
    </header>

    <aside v-if="hasSide" class="mx-auto mb-8 max-w-article lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:mb-0 lg:max-w-none lg:pt-12" :aria-label="article.cover || article.facts.length ? 'O artigo em números e o sumário' : 'Sumário'">
      <BlogCover v-if="article.cover || article.facts.length" :cover="article.cover" :facts="article.facts" class="mb-6 lg:mb-10" />
      <BlogToc v-if="hasToc" :items="article.toc" class="lg:sticky lg:top-6" />
    </aside>

    <div class="mx-auto min-w-0 max-w-article lg:col-start-1 lg:row-start-2 lg:mx-0">
      <BlogArticleBody :slug="article.slug" :segments="article.segments" />

      <p class="mt-10 text-meta text-fg-muted" data-testid="blog-method">
        Escrito com apoio de IA na pesquisa e na revisão do texto. Os fatos foram conferidos nas fontes do fim (edital, lei, estudos).
        Achou um erro? Escreva para <UiLink :href="`mailto:${contactEmail}`" variant="muted" class="underline">{{ contactEmail }}</UiLink>.
      </p>

      <BlogEndCta :slug="article.slug" :area="article.area" class="mt-10" />
    </div>

    <section v-if="related.length" class="mt-14 lg:col-span-2 lg:row-start-3" aria-labelledby="h-related">
      <h2 id="h-related" class="mb-5 text-section text-fg-strong">Leia também</h2>
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <BlogArticleCard v-for="r in related" :key="r.slug" :article="r" />
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
// /blog/{slug} (prd-blog-seo RF-B7): the article of the build, prerendered with the full text, the head and the
// JSON-LD. Unknown slug = 404 (the prerender only knows the slugs of content/blog).
import { articles, authors } from '#blog/index'
import loaders from '#blog/articles'
import '~/assets/css/blog-prose.css'
import { articleJsonLd, breadcrumbJsonLd, categoryLabel, faqJsonLd, formatBlogDate, relatedArticles } from '~/utils/blog'

// The page has its own primary call: the header's "Criar conta grátis" goes quiet (one highlight per screen, ADR-027 §6)
definePageMeta({ layout: 'public', quietHeaderCta: true })

const route = useRoute()
const slug = String(route.params.slug)
const load = loaders[slug]
if (!load) throw createError({ statusCode: 404, statusMessage: 'Artigo não encontrado', fatal: true })

const article = (await load()).default
const author = authors[article.author]!
const related = relatedArticles(article, articles)
const hasToc = article.toc.length >= 4
const hasSide = hasToc || !!article.cover || article.facts.length > 0
const contactEmail = useRuntimeConfig().public.contactEmail

useBlogSeo({
  title: article.seoTitle,
  description: article.description,
  path: `/blog/${article.slug}`,
  type: 'article',
  image: article.image,
  published: article.published,
  modified: article.updated,
  jsonLd: [
    articleJsonLd(article, author),
    breadcrumbJsonLd([
      { name: 'Início', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: article.title, path: `/blog/${article.slug}` },
    ]),
    ...(article.faq.length ? [faqJsonLd(article.faq)] : []),
  ],
})

const { track } = useAnalytics()
onMounted(() => track('blog_viewed', { slug: article.slug, category: article.category }))
</script>
