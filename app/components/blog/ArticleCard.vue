<template>
  <article class="group relative flex flex-col gap-3">
    <div class="flex h-32 flex-col justify-end rounded-card bg-soft p-5 sm:h-36" aria-hidden="true">
      <template v-if="article.cover">
        <UiNumber :value="article.cover.value" size="m" />
        <span class="mt-2 line-clamp-2 text-meta text-fg-muted">{{ article.cover.label }}</span>
      </template>
      <span v-else class="text-section text-fg-muted">{{ categoryLabel(article.category) }}</span>
    </div>
    <BlogCategoryLabel :category="article.category" :extra="[`${article.readingMinutes} min`]" />
    <h3 class="text-title text-fg-strong">
      <NuxtLink :to="`/blog/${article.slug}`" class="after:absolute after:inset-0 after:rounded-card group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus">{{ article.title }}</NuxtLink>
    </h3>
    <p class="line-clamp-2 text-meta text-fg-muted">{{ article.description }}</p>
  </article>
</template>

<script setup lang="ts">
// A card of the list of articles (prd-blog-v2 RF-V1): a gray cover with the article's number in Fraunces (or only the
// category when there is no honest number), the category with its dot, the title and 2 lines. The whole card is the
// link (the title's ::after); the cover is decorative (its number repeats the text of the article).
import type { BlogMeta } from '~~/modules/blog/types'
import { categoryLabel } from '~/utils/blog'

defineProps<{ article: BlogMeta }>()
</script>
