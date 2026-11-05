<template>
  <section class="px-gutter py-14 lg:py-20" aria-labelledby="landing-final" data-landing="final" data-ds-scope>
    <div class="mx-auto flex max-w-page flex-col items-center gap-6 rounded-card bg-action px-6 py-12 text-center text-on-action lg:flex-row lg:gap-10 lg:px-12 lg:text-left">
      <picture class="shrink-0">
        <source srcset="~/assets/mascots/mascot-baigi-celebrating.avif" type="image/avif">
        <img src="~/assets/mascots/mascot-baigi-celebrating.webp" alt="" width="112" height="112" loading="lazy" decoding="async" class="size-28 object-contain">
      </picture>
      <div class="flex-1">
        <h2 id="landing-final" class="text-heading text-balance text-on-action lg:text-heading-lg">Amanhã o Baigi já sabe o que você precisa revisar.</h2>
        <p class="mt-2 text-lead text-on-action">Crie a conta, mande um material e faça o primeiro lote hoje.</p>
      </div>
      <UiButton to="/criar-conta" class="w-full shrink-0 sm:w-auto sm:px-8" data-testid="landing-final-cta" @click="emit('cta')">
        Criar conta grátis
      </UiButton>
    </div>
  </section>
</template>

<script setup lang="ts">
// The last call (prd-landing-v4 RF-L9): a solid purple block with the celebrating mascot. On it, the action is the
// neutral button (white on purple): the block is the screen's highlight, never two purples (ADR-027 §6).
const emit = defineEmits<{ cta: [] }>()
</script>
