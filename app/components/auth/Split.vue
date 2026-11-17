<template>
  <div class="au-shell">
    <!-- The form first in the DOM (the h1 comes first for a screen reader); on the phone the band is drawn above it -->
    <main class="au-main">
      <div class="au-col">
        <NuxtLink to="/" class="au-logo" aria-label="Baigi: ir para o início">
          <UiLogo :icon-size="34" text-class="text-section" />
        </NuxtLink>
        <slot />
        <nav class="au-footer" aria-label="Documentos">
          <UiLink to="/termos" variant="muted" class="underline">Termos</UiLink>
          <UiLink to="/privacidade" variant="muted" class="underline">Privacidade</UiLink>
        </nav>
        <!-- Part of the page, not over it: the form is never covered (prd-4g RF-F11) -->
        <ClientOnly><LazyUiConsentBanner v-if="consent.analytics.value === null" inline /></ClientOnly>
      </div>
    </main>

    <aside class="au-band" aria-label="Sobre o Baigi" data-testid="auth-band">
      <div class="au-band-in">
        <UiBaigiMascot class="au-mascot" :expression="mascot" :size="150" priority />
        <div>
          <p class="au-headline" data-testid="auth-band-headline">{{ headline }}</p>
          <p class="au-sub">{{ sub }}</p>
        </div>
        <!-- From 960 px only: the example card, the three items -->
        <div v-if="$slots.extra" class="au-extra"><slot name="extra" /></div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
// The split screen of the auth pages (prototype approved on 17/11, skin of the landing D): the form on the left with
// the logo and the legal links, the violet band on the right with the dolphin, a headline and a per-page extra. Under
// 960 px the band is a short strip on top (dolphin, headline and subline) and the form follows on the page. Styles in
// components/auth/auth-split.css, loaded by layouts/auth-split.vue.
import type { MascotExpression } from '~/components/ui/BaigiMascot.vue'

defineProps<{
  headline: string
  sub: string
  mascot: MascotExpression
}>()

const consent = useConsent()
</script>
