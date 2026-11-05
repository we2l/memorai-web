<template>
  <picture class="block">
    <source :srcset="src('dark', 'avif')" type="image/avif" media="(prefers-color-scheme: dark)">
    <source :srcset="src('dark', 'webp')" type="image/webp" media="(prefers-color-scheme: dark)">
    <source :srcset="src('light', 'avif')" type="image/avif">
    <img
      :src="src('light', 'webp')"
      :alt="SHOTS[name].alt"
      width="390"
      :height="SHOTS[name].height"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
      class="h-auto w-full rounded-card bg-raised shadow-raised ring-1 ring-line"
    >
  </picture>
</template>

<script setup lang="ts">
// A real screen of the app (prd-landing-v4 RF-L12), captured by e2e/landing/shots.ts at 390 px (2x). One <picture>
// with the light and the dark capture: the browser downloads only the one of the system theme (a visitor of the
// landing has no theme of the app chosen yet). The hero's is the LCP: eager and high priority; the others are lazy.
import { SHOTS, type ShotName } from '~/utils/landing'

const props = defineProps<{ name: ShotName, priority?: boolean }>()

const FILES = import.meta.glob<string>('~/assets/landing/*.{avif,webp}', { eager: true, query: '?url', import: 'default' })

function src(theme: 'light' | 'dark', ext: 'avif' | 'webp'): string {
  const key = Object.keys(FILES).find(k => k.endsWith(`/${props.name}-${theme}.${ext}`))
  return key ? FILES[key]! : ''
}
</script>
