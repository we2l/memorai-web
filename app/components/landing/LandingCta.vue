<template>
  <NuxtLink
    :to="to"
    prefetch-on="interaction"
    class="lp-btn"
    :class="[`lp-btn-${tone}`, { 'lp-btn-sm': small }]"
    :data-cta="section ? '' : undefined"
    :data-testid="`landing-cta-${position}${area ? `-${area}` : ''}`"
    @click="track?.(position, area)"
  >
    <slot />
  </NuxtLink>
</template>

<script setup lang="ts">
// A call of the landing D (prd-landing-d §5.3): a 56 px pill with centered text. `primary` is the brand purple,
// `band` the white button on a color band (text in the band's tone), `ghost` the neutral one. `section`: it is the
// call of its section, so the header button and the sticky bar step aside while it is on screen. The route is
// prefetched on hover/focus, not when the call shows up: a dozen calls would fetch /criar-conta's payload a dozen times.
import { LANDING_CTA, type LandingArea, type LandingCtaPosition } from '~/utils/landing'

withDefaults(defineProps<{
  to: string
  position: LandingCtaPosition
  tone?: 'primary' | 'band' | 'ghost'
  area?: LandingArea
  section?: boolean
  small?: boolean
}>(), { tone: 'primary', area: undefined, section: false, small: false })

const track = inject(LANDING_CTA, null)
</script>
