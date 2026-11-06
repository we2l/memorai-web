<template>
  <picture class="lp-mascot">
    <source :srcset="`/landing/mascote/${POSES[pose].file}.avif`" type="image/avif">
    <img :src="`/landing/mascote/${POSES[pose].file}.webp`" :width="POSES[pose].w" :height="POSES[pose].h" alt="" decoding="async" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'low' : undefined">
  </picture>
</template>

<script setup lang="ts">
// The dolphin of the landing D: only the poses that exist (prototype README, "Mascote"). Decorative (alt=""): what
// it says is real text in a bubble next to it. From public/landing (not assets/): no hashed import, so Nuxt does not
// prefetch every pose in both formats on the first visit. The hero's loads eagerly but after the LCP poster.
export type MascotPose = 'standing' | 'thinking' | 'podcast' | 'celebrating'

defineProps<{ pose: MascotPose, eager?: boolean }>()

const POSES: Record<MascotPose, { file: string, w: number, h: number }> = {
  standing: { file: 'mascot-baigi', w: 256, h: 400 },
  thinking: { file: 'mascot-baigi-thinking', w: 192, h: 311 },
  podcast: { file: 'mascot-baigi-podcast', w: 224, h: 263 },
  celebrating: { file: 'mascot-baigi-celebrating', w: 224, h: 262 },
}
</script>
