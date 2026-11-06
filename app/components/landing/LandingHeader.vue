<template>
  <header class="lp-header">
    <div class="lp-wrap">
      <NuxtLink to="/" class="lp-logo" aria-label="Baigi: início">
        <img src="/landing/mascote/mascot-baigi-bust-64.webp" width="64" height="53" alt="" decoding="async">
        <span aria-hidden="true">BAIGI.</span>
      </NuxtLink>
      <nav class="lp-nav" aria-label="Seções">
        <a href="#como">Como funciona</a>
        <a href="#simulado">Simulados</a>
        <a href="#podcast">Podcast</a>
        <a href="#planos">Planos</a>
      </nav>
      <NuxtLink to="/entrar" class="lp-enter">Entrar</NuxtLink>
      <!-- Desktop only, and only when no call of a section is on screen (one highlight per screen) -->
      <LandingCta to="/criar-conta" position="header" small class="lp-header-cta" :data-hidden="String(!showCta)" :tabindex="showCta ? undefined : -1">
        Criar conta grátis
      </LandingCta>
    </div>
  </header>
</template>

<script setup lang="ts">
// Header of the landing D (prd-landing-d RF-D1): sticky; the logo in the title face; the anchors of the sections on
// the desktop; "Entrar"; the call only when the page says no other call is on screen.
defineProps<{ showCta: boolean }>()
</script>
