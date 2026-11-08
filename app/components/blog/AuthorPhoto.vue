<template>
  <picture>
    <source :srcset="`${photo}.avif`" type="image/avif">
    <img :src="`${photo}.webp`" :alt="alt" :width="size" :height="size" :loading="eager ? 'eager' : 'lazy'" decoding="async" class="shrink-0 rounded-full object-cover" :class="SIZE[size]">
  </picture>
</template>

<script setup lang="ts">
// Real photo of the author (sent by him, no EXIF; public/quem-faz, out of the precache)
withDefaults(defineProps<{ photo: string, alt: string, size?: 40 | 160, eager?: boolean }>(), { size: 40, eager: false })
const SIZE = { 40: 'size-10', 160: 'size-40' } as const
</script>
