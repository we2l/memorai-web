<template>
  <span class="lp-mascot">
    <img :src="`/mascote/${POSES[pose]}.svg`" :width="sizes[POSES[pose]].w" :height="sizes[POSES[pose]].h" alt="" decoding="async" :loading="eager ? 'eager' : 'lazy'" :fetchpriority="eager ? 'low' : undefined">
  </span>
</template>

<script setup lang="ts">
// The dolphin of the landing D. Decorative (alt=""): what it says is real text in a bubble next to it. The static
// SVG of the expression (public/mascote, the same files as UiBaigiMascot; scripts/mascote-svgs.mjs): no hashed
// import, so nothing is prefetched on the first visit. The hero's loads eagerly but after the LCP poster.
import sizes from '~/assets/mascote/estados.json'
import type { MascotExpression } from '~/components/ui/BaigiMascot.vue'

export type MascotPose = 'standing' | 'thinking' | 'podcast' | 'celebrating'

defineProps<{ pose: MascotPose, eager?: boolean }>()

const POSES: Record<MascotPose, MascotExpression> = {
  standing: 'neutro',
  thinking: 'pensando',
  podcast: 'ouvindo',
  celebrating: 'confete',
}
</script>
