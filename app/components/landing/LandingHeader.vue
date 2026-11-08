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
      <!-- Desktop only, always there, like the prototype D (owner, 06/11) -->
      <LandingCta to="/comecar" position="header" small class="lp-header-cta">
        Criar conta grátis
      </LandingCta>
    </div>
  </header>
</template>

<script setup lang="ts">
// Header of the landing D (prd-landing-d RF-D1): sticky; the logo in the title face; the anchors of the sections and
// the call on the desktop (always, owner 06/11: hiding it left a hole after "Entrar"); "Entrar".
</script>
