<template>
  <span v-if="author.mascot" class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-soft" aria-hidden="true">
    <img :src="BUST" alt="" width="32" height="32" class="size-8 object-contain" decoding="async">
  </span>
  <BlogAuthorPhoto v-else-if="author.photo" :photo="author.photo" :alt="author.name" :size="40" />
</template>

<script setup lang="ts">
// The face of the byline (prd-blog-v2 RF-A4): the official dolphin for the brand, a real photo for a person author.
// Decorative next to the name, so no alt for the dolphin. The bust comes from public/landing (out of the precache), not
// from ~/assets: an imported asset becomes a chunk shared with UiLogo/the landing and grows their budget.
import type { BlogAuthor } from '~~/modules/blog/authors'

defineProps<{ author: BlogAuthor }>()
/** A plain string (a static src would be turned into an asset shared with the landing) */
const BUST = '/landing/mascote/mascot-baigi-bust-64.webp'
</script>
