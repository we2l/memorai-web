<template>
  <article class="blog-featured grid overflow-hidden rounded-hero bg-raised shadow-1" data-testid="blog-featured">
    <div class="blog-featured-cover flex flex-col justify-center bg-soft p-6 sm:p-8" aria-hidden="true">
      <template v-if="article.cover">
        <UiNumber :value="article.cover.value" size="xl" />
        <span class="blog-featured-cover-label mt-3 text-body text-fg-muted">{{ article.cover.label }}</span>
      </template>
      <span v-else class="text-page-title text-fg-muted">{{ categoryLabel(article.category) }}</span>
    </div>
    <div class="flex flex-col gap-4 p-6 sm:p-8">
      <p class="flex flex-wrap items-center gap-2 text-label text-fg-muted">
        <span>Em destaque</span><span aria-hidden="true">·</span><BlogCategoryLabel :category="article.category" class="inline-flex" />
      </p>
      <h2 class="text-page-title text-fg-strong">
        <NuxtLink :to="href" class="blog-title-link">{{ article.title }}</NuxtLink>
      </h2>
      <p class="text-body text-fg">{{ article.description }}</p>
      <div class="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
        <p class="flex items-center gap-2 text-meta text-fg-muted">
          <BlogAuthorMark v-if="author" :author="author" />
          <span>{{ author?.name }} · <time :datetime="article.updated">{{ formatBlogDateShort(article.updated) }}</time> · {{ article.readingMinutes }} min</span>
        </p>
        <UiButton variant="primary" :to="href" :icon-right="ArrowRight" data-testid="blog-featured-cta">Ler o guia</UiButton>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
// The highlight of /blog (prd-blog-v2 RF-V1): the `featured` article or the newest. The cover on the left, the text on
// the right; "Ler o guia" is the one purple of the page.
import { ArrowRight } from 'lucide-vue-next'
import { authors } from '#blog/index'
import type { BlogMeta } from '~~/modules/blog/types'
import { categoryLabel, formatBlogDateShort } from '~/utils/blog'

const props = defineProps<{ article: BlogMeta }>()
const href = computed(() => `/blog/${props.article.slug}`)
const author = computed(() => authors[props.article.author])
</script>
