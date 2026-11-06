<template>
  <header class="border-b border-line bg-raised">
    <div class="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-gutter">
      <NuxtLink to="/" class="inline-flex min-h-touch items-center rounded-control" aria-label="Baigi: ir para o início">
        <UiLogo :icon-size="24" text-class="text-body text-fg-strong" />
      </NuxtLink>
      <nav aria-label="Conta" class="flex items-center gap-2">
        <UiButton v-if="user" size="sm" to="/hoje">Ir para o Hoje</UiButton>
        <template v-else>
          <UiLink to="/entrar" variant="muted" standalone class="px-3 text-meta">Entrar</UiLink>
          <UiButton :variant="quietCta ? 'secondary' : 'primary'" size="sm" to="/criar-conta">Criar conta grátis</UiButton>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
// Header of the public pages (prd-4h-landing-v3 RF-F12): "Ir para o Hoje" when there is a session, decided after
// hydration. `quietCta`: the page has its own primary (/planos), one highlight per screen (ADR-027 §6).
defineProps<{ quietCta?: boolean }>()

const user = useHydratedUser()
</script>
