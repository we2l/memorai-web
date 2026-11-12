<template>
  <div class="flex items-center gap-2">
    <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-bust-64.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-bust-64.webp" :alt="showText ? '' : 'Baigi'" :width="iconSize" :height="iconSize" class="object-contain" decoding="async" /></picture>
    <!-- The landing's wordmark (Bricolage 700, ADR-028) as a mask over the text color: the same letters everywhere,
         without loading the font, and out of the JS (public/brand/baigi-wordmark.svg) -->
    <span v-if="showText" role="img" aria-label="Baigi" :class="textClass"><span class="block h-[0.72em] w-[2.92em] bg-current" :style="WORDMARK" /></span>
  </div>
</template>

<script setup lang="ts">
const WORDMARK = 'mask:url(/brand/baigi-wordmark.svg) center/contain no-repeat;-webkit-mask:url(/brand/baigi-wordmark.svg) center/contain no-repeat'
withDefaults(defineProps<{
  iconSize?: number
  showText?: boolean
  textClass?: string
}>(), {
  iconSize: 28,
  showText: true,
  textClass: 'text-body',
})
</script>
