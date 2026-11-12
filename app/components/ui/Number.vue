<template>
  <span class="inline-flex items-baseline text-fg-strong" :class="[SIZES[size], weight === 'normal' && 'n-normal']" :aria-label="unit ? `${value} ${unit}` : undefined" :role="unit ? 'text' : undefined">
    <span :aria-hidden="unit ? 'true' : undefined">{{ value }}</span>
    <span v-if="unit" data-unit aria-hidden="true">{{ unit }}</span>
  </span>
</template>

<script setup lang="ts">
// A big number (ADR-035 §2, RN-3; prd-visual-e2 RF-1.3): Fraunces 600 on the digits only, from 28 px up, always
// in --fg-strong (the color never informs). The unit ("de 20", "dias", "%" stays in the number) goes in Inter,
// smaller and muted; with a unit the whole reads as one label ("18 de 20").
withDefaults(defineProps<{
  value: string | number
  unit?: string
  /** xl 76 · hero 56 · l 52 · m 38 · s 28 px */
  size?: 'xl' | 'hero' | 'l' | 'm' | 's'
  /** normal: the Fraunces 400 of a secondary number beside the main one (A2, ADR-037: domínio and acerto of the hub) */
  weight?: 'semibold' | 'normal'
}>(), { unit: undefined, size: 'm', weight: 'semibold' })

// hero (A2, the "Revisar hoje" of the hub): num-l at 56 px, in the scoped style (no new utility in entry.css)
const SIZES = { xl: 'num-xl', hero: 'num-l n-hero', l: 'num-l', m: 'num-m', s: 'num-s' } as const
</script>

<style scoped>
.n-hero {
  font-size: 3.5rem;
}

.n-normal {
  font-weight: 400;
}

[data-unit] {
  font-family: var(--font-sans);
  font-size: max(0.42em, 0.875rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-muted);
  margin-left: 0.22em;
}
</style>

<!-- The @font-face of the Fraunces live with the big numbers, not in entry.css (ADR-035 §2) -->
<!-- @import, not <style src>: vite:vue caches a src style by file path, and two SFCs with the same src at different
     style indexes (Number at 1, Stat at 0) broke the Vercel build depending on the module order -->
<style>
@import "~/assets/css/fraunces.css";
</style>
