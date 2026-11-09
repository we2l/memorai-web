<template>
  <article class="relative flex flex-col gap-2 rounded-card bg-raised p-5 shadow-1">
    <p class="text-label text-fg-muted">{{ categoryLabel(article.category) }}</p>
    <h3 class="text-section text-fg-strong">
      <NuxtLink :to="`/blog/${article.slug}`" class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus">{{ article.title }}</NuxtLink>
    </h3>
    <p class="text-meta text-fg">{{ article.description }}</p>
    <p class="mt-auto pt-2 text-meta text-fg-muted">
      <time :datetime="article.updated">{{ formatBlogDate(article.updated) }}</time> · {{ article.readingMinutes }} min de leitura
    </p>
  </article>
</template>

<script setup lang="ts">
// A card of the list of articles (RF-B6): the whole card is the link (the title's ::after), focus on the card
import type { BlogMeta } from '~~/modules/blog/types'
import { categoryLabel, formatBlogDate } from '~/utils/blog'

defineProps<{ article: BlogMeta }>()
</script>
