<template>
  <picture>
    <source :srcset="`${photo}.avif`" type="image/avif">
    <img :src="`${photo}.webp`" :alt="alt" :width="size" :height="size" :loading="eager ? 'eager' : 'lazy'" decoding="async" class="shrink-0 rounded-full object-cover" :style="{ width: `${size}px`, height: `${size}px` }">
  </picture>
</template>

<script setup lang="ts">
// Real photo of the author (sent by him, no EXIF; public/quem-faz, out of the precache)
withDefaults(defineProps<{ photo: string, alt: string, size?: number, eager?: boolean }>(), { size: 40, eager: false })
</script>
