<template>
  <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-fg-muted">
    <span class="inline-flex items-center gap-1.5 font-semibold text-fg">
      <UiSubjectMark :color="BLOG_CATEGORY_TONE[category]" size="sm" />{{ categoryLabel(category) }}
    </span>
    <template v-for="part in extra" :key="part">
      <span aria-hidden="true">·</span><span>{{ part }}</span>
    </template>
  </p>
</template>

<script setup lang="ts">
// The category of an article with its dot (prd-blog-v2 RF-V1/RF-V2): the color only in small, never purple (the
// action's color), and the name beside it informs. `extra` follows it ("TJ-SP Escrevente", "10 min").
import { BLOG_CATEGORY_TONE, type BlogCategory } from '~~/modules/blog/types'
import { categoryLabel } from '~/utils/blog'

withDefaults(defineProps<{ category: BlogCategory, extra?: string[] }>(), { extra: () => [] })
</script>
