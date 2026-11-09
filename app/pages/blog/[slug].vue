<template>
  <!-- Reading column ~700 px (max-w-article) inside a wider one for the quiz, tools and prints (max-w-article-wide); the
       table of contents goes to the side only from 1280 px, never taking width from the text -->
  <div v-if="article" class="mx-auto max-w-page px-gutter pt-6 lg:pt-10 xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-12">
    <article class="mx-auto w-full max-w-article-wide" data-testid="blog-article">
      <header class="mx-auto max-w-article">
      <nav aria-label="Caminho" class="mb-4 text-meta text-fg-muted">
        <ol class="flex flex-wrap gap-1">
          <li><UiLink to="/blog" variant="muted">Blog</UiLink> ›</li>
          <li><UiLink :to="`/blog#${article.category}`" variant="muted">{{ categoryLabel(article.category) }}</UiLink></li>
        </ol>
      </nav>

      <h1 class="mb-4 text-page-title text-fg-strong">{{ article.title }}</h1>
      <p v-if="article.summary" class="blog-lead mb-5 text-fg-strong" data-testid="blog-summary">{{ article.summary }}</p>

      <div class="mb-6 flex items-center gap-3 border-y border-line py-3">
        <BlogAuthorPhoto v-if="author.photo" :photo="author.photo" :alt="`${firstName}, criador do Baigi`" :size="40" eager />
        <p class="text-meta text-fg-muted">
          Por <UiLink :to="author.page" variant="action">{{ author.name }}</UiLink>
          · Atualizado em <time :datetime="article.updated">{{ formatBlogDate(article.updated) }}</time>
          · {{ article.readingMinutes }} min de leitura
        </p>
      </div>
      </header>

      <BlogToc v-if="article.toc.length >= 4" :items="article.toc" class="mx-auto mb-8 max-w-article xl:hidden" />

      <BlogArticleBody :slug="article.slug" :segments="article.segments" />

      <p class="mx-auto mt-10 max-w-article text-meta text-fg-muted">
        Escrito com apoio de IA na pesquisa e na revisão do texto. Os fatos e as fontes foram conferidos por {{ firstName }}.
        Achou um erro? Escreva para <UiLink :href="`mailto:${contactEmail}`" variant="muted" class="underline">{{ contactEmail }}</UiLink>.
      </p>

      <BlogEndCta :slug="article.slug" :area="article.area" class="mx-auto mt-10 max-w-article" />

      <section v-if="related.length" class="mx-auto mt-12 max-w-article" aria-labelledby="h-related">
        <h2 id="h-related" class="mb-4 text-section text-fg-strong">Leia também</h2>
        <div class="grid gap-4">
          <BlogArticleCard v-for="r in related" :key="r.slug" :article="r" />
        </div>
      </section>
    </article>

    <aside v-if="article.toc.length >= 4" class="hidden xl:block">
      <BlogToc :items="article.toc" />
    </aside>
  </div>
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
const firstName = author.name.split(' ')[0]
const related = relatedArticles(article, articles)
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
