<template>
  <div>
    <template v-for="(seg, i) in segments" :key="i">
      <!-- Build-time HTML of our own Markdown (modules/blog: raw HTML is refused there), never user input -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="seg.kind === 'html'" class="blog-prose" v-html="seg.html" />
      <BlogQuiz v-else-if="seg.kind === 'quiz'" :slug="slug" :area="seg.area" :title="seg.title" :cards="seg.cards" class="my-10" />
      <BlogInlineCta v-else-if="seg.kind === 'cta'" :slug="slug" :area="seg.area" :text="seg.text" class="my-8" />
      <BlogExampleCard v-else-if="seg.kind === 'card'" :q="seg.q" :a="seg.a" :source="seg.source" class="my-8" />
      <BlogShot v-else-if="seg.kind === 'shot'" :shot="seg.shot" :caption="seg.caption" class="my-10" />
      <div v-else-if="seg.kind === 'tool'" class="my-10">
        <LazyBlogForgettingCalculator v-if="seg.tool === 'calculadora-do-esquecimento'" :slug="slug" embedded />
        <LazyBlogExamPlanner v-else :slug="slug" embedded />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Body of an article (prd-blog-seo RF-B7): the HTML segments of the build with the embeds between them. The page gives
// the column (max-w-article, prd-blog-v2): text, quiz, tools and prints share it.
import '~/assets/css/blog-prose.css'
import type { BlogSegment } from '~~/modules/blog/types'

defineProps<{ slug: string, segments: BlogSegment[] }>()
</script>
