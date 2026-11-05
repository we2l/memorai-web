<template>
  <section class="px-gutter py-12 lg:py-24" aria-labelledby="landing-final" data-landing="final" data-ds-scope>
    <div class="mx-auto flex max-w-page flex-col items-center gap-6 rounded-card bg-tinted px-6 py-12 text-center lg:flex-row lg:gap-10 lg:px-12 lg:text-left">
      <picture class="shrink-0">
        <source srcset="~/assets/mascots/mascot-baigi.avif" type="image/avif">
        <img src="~/assets/mascots/mascot-baigi.webp" alt="" width="96" height="96" loading="lazy" decoding="async" class="size-24 object-contain">
      </picture>
      <div class="flex-1">
        <h2 id="landing-final" class="text-heading text-balance text-fg-strong">Amanhã o Baigi já sabe o que você precisa revisar.</h2>
        <p class="mt-2 text-lead text-fg">Crie a conta, mande um material e faça o primeiro lote hoje.</p>
      </div>
      <UiButton variant="primary" to="/criar-conta" class="w-full shrink-0 sm:w-auto sm:px-8" data-testid="landing-final-cta" @click="emit('cta')">
        Criar conta grátis
      </UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
// The last call (prd-landing-v4 RF-L9): the page's only lilac block of text and the mascot (ADR-027 §6).
const emit = defineEmits<{ cta: [] }>()
</script>
