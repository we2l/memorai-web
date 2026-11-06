<template>
  <div class="lp-media">
    <picture>
      <template v-if="CLIPS[clip].dark">
        <source :srcset="file('dark', '-poster.avif')" type="image/avif" media="(prefers-color-scheme: dark)">
        <source :srcset="file('dark', '-poster.webp')" type="image/webp" media="(prefers-color-scheme: dark)">
      </template>
      <source :srcset="file('light', '-poster.avif')" type="image/avif">
      <img
        :src="file('light', '-poster.webp')"
        :alt="CLIPS[clip].alt"
        width="390"
        height="844"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'auto'"
        :decoding="priority ? undefined : 'async'"
      >
    </picture>
    <!-- Muted loop over the poster; nothing downloads before it plays (RF-D14), never with reduced motion -->
    <video muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" :data-auto="auto ? '' : undefined" :data-clip="clip">
      <template v-if="CLIPS[clip].dark">
        <source :src="file('dark', '.webm')" type="video/webm" media="(prefers-color-scheme: dark)">
        <source :src="file('dark', '.mp4')" type="video/mp4" media="(prefers-color-scheme: dark)">
      </template>
      <source :src="file('light', '.webm')" type="video/webm">
      <source :src="file('light', '.mp4')" type="video/mp4">
    </video>
  </div>
</template>

<script setup lang="ts">
// A real recording of the app (prd-landing-d RF-D14): the poster is an <img> (light/dark by the system theme, like a
// first visitor's), so the hero's can be the LCP with high priority; the clip fades in over it only once it plays.
// `auto`: utils/landingMotion.ts plays it while on screen; the stage of LandingStory drives its own.
import { CLIPS, type ClipName } from '~/utils/landing'

const props = withDefaults(defineProps<{ clip: ClipName, priority?: boolean, auto?: boolean }>(), { priority: false, auto: true })

function file(theme: 'light' | 'dark', suffix: string): string {
  return `/landing/video/${props.clip}-${theme}${suffix}`
}
</script>
