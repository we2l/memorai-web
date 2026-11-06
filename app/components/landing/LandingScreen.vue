<template>
  <picture>
    <source :srcset="file('dark', 'avif')" type="image/avif" media="(prefers-color-scheme: dark)">
    <source :srcset="file('dark', 'webp')" type="image/webp" media="(prefers-color-scheme: dark)">
    <source :srcset="file('light', 'avif')" type="image/avif">
    <img
      :src="file('light', 'webp')"
      :alt="SCREENS[name].alt"
      width="390"
      :height="SCREENS[name].height"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
    >
  </picture>
</template>

<script setup lang="ts">
// A real screen of the app (e2e/landing/shots.ts, public/landing), light or dark by the system theme: the browser
// downloads only the one it shows.
import { SCREENS, type ScreenName } from '~/utils/landing'

const props = defineProps<{ name: ScreenName, priority?: boolean }>()

function file(theme: 'light' | 'dark', ext: 'avif' | 'webp'): string {
  return `/landing/${props.name}-${theme}.${ext}`
}
</script>
