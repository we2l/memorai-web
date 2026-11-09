<template>
  <figure class="mx-auto max-w-80">
    <picture class="dark:hidden">
      <source :srcset="`${s.light}.avif`" type="image/avif">
      <img :src="`${s.light}.webp`" :alt="s.alt" :width="s.width" :height="s.height" loading="lazy" decoding="async" class="h-auto w-full rounded-card shadow-1">
    </picture>
    <picture class="hidden dark:block">
      <source :srcset="`${s.dark}.avif`" type="image/avif">
      <img :src="`${s.dark}.webp`" :alt="s.alt" :width="s.width" :height="s.height" loading="lazy" decoding="async" class="h-auto w-full rounded-card shadow-1">
    </picture>
    <figcaption class="mt-2 text-center text-meta text-fg-muted">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
// A real screen of the app (RN-2), in the theme of the page: the hidden <picture> never downloads (display:none + lazy)
import { BLOG_SHOTS, type BlogShot } from '~~/modules/blog/types'

const props = defineProps<{ shot: BlogShot, caption: string }>()
const s = computed(() => BLOG_SHOTS[props.shot])
</script>
