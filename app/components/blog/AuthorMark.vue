<template>
  <span v-if="author.mascot" class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-soft" aria-hidden="true">
    <picture class="contents">
      <source srcset="~/assets/mascots/mascot-baigi-bust-64.avif" type="image/avif">
      <img src="~/assets/mascots/mascot-baigi-bust-64.webp" alt="" width="32" height="32" class="size-8 object-contain" decoding="async">
    </picture>
  </span>
  <BlogAuthorPhoto v-else-if="author.photo" :photo="author.photo" :alt="author.name" :size="40" />
</template>

<script setup lang="ts">
// The face of the byline (prd-blog-v2 RF-A4): the official dolphin for the brand (the bust of UiLogo, already in the
// bundle), a real photo for a person author. Decorative next to the name, so no alt for the dolphin.
import type { BlogAuthor } from '~~/modules/blog/authors'

defineProps<{ author: BlogAuthor }>()
</script>
