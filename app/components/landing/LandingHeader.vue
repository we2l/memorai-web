<template>
  <header class="border-b border-line bg-raised px-gutter md:sticky md:top-0 md:z-sticky" data-ds-scope>
    <div class="mx-auto flex h-14 max-w-page items-center justify-between gap-4">
      <NuxtLink to="/" class="inline-flex min-h-touch items-center rounded-control" aria-label="Baigi: início">
        <UiLogo :icon-size="24" text-class="text-body text-fg-strong" />
      </NuxtLink>
      <nav aria-label="Principal" class="flex items-center gap-1">
        <!-- The display of a Ui* root is its own (inline-flex): hide the wrapper, never the component -->
        <div class="hidden items-center gap-1 md:flex">
          <UiLink href="#como-funciona" variant="muted" standalone class="px-3 text-meta">Como funciona</UiLink>
          <UiLink href="#planos" variant="muted" standalone class="px-3 text-meta">Planos</UiLink>
        </div>
        <UiLink to="/entrar" variant="muted" standalone class="px-3 text-meta">Entrar</UiLink>
        <!-- Desktop only, and only when no other primary is on screen (the hero's or the final one) -->
        <div v-show="showCta" class="ml-2 hidden md:block">
          <UiButton variant="primary" size="sm" to="/criar-conta" data-testid="landing-header-cta" @click="emit('cta')">Criar conta grátis</UiButton>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
// Header of the landing v4 (prd-landing-v4 RF-L1): sticky on the desktop; on the phone it scrolls away and the
// action lives in LandingStickyCta, in the thumb zone. One highlight per screen (ADR-027 §6): the page decides
// when the action shows up here.
defineProps<{ showCta: boolean }>()
const emit = defineEmits<{ cta: [] }>()
</script>
