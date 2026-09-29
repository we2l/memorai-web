<template>
  <div class="flex items-center gap-2">
    <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-bust-64.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-bust-64.webp" alt="Baigi" :width="iconSize" :height="iconSize" class="object-contain" decoding="async" /></picture>
    <span v-if="showText" class="font-logo font-bold tracking-[0.08em]" :class="textClass">BAIGI.</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  iconSize?: number
  showText?: boolean
  textClass?: string
}>(), {
  iconSize: 28,
  showText: true,
  textClass: 'text-lg text-accent-primary',
})
</script>
