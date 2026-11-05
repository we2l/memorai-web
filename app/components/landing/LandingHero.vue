<template>
  <section class="relative overflow-hidden px-gutter pt-10 pb-16 lg:pt-16 lg:pb-20" aria-labelledby="landing-title" data-ds-scope>
    <div class="mx-auto max-w-page text-center">
      <h1 id="landing-title" class="mx-auto max-w-5xl text-hero text-balance text-fg-strong lg:text-hero-lg">
        <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.title[0] }}<br class="max-md:hidden"><mark class="rounded-tag bg-action-subtle box-decoration-clone pr-0.5 pl-1 text-fg-strong">{{ v.title[1] }}</mark>{{ v.title[2] }}</span>
      </h1>
      <p class="mx-auto mt-5 max-w-2xl text-lead text-pretty text-fg">
        <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.lead }}</span>
      </p>
      <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" data-landing="hero-cta">
        <UiButton variant="primary" to="/criar-conta" class="w-full sm:w-auto sm:px-8" data-testid="landing-hero-cta" @click="emit('cta')">Criar conta grátis</UiButton>
        <UiButton href="#como-funciona" class="w-full sm:w-auto sm:px-6">Ver como funciona</UiButton>
      </div>
      <!-- Room for two lines on a phone: the trial of the catalog arrives after the first paint, without moving the page -->
      <ul class="mt-5 flex min-h-12 flex-wrap content-start items-center justify-center gap-x-5 gap-y-2 text-meta text-fg sm:min-h-5" data-testid="landing-guarantees">
        <li v-for="g in landingGuarantees(trial)" :key="g" class="flex items-center gap-1.5">
          <Check class="size-4 shrink-0 text-success" aria-hidden="true" />{{ g }}
        </li>
      </ul>
      <p class="mt-1 text-meta text-fg-muted">{{ AUDIENCE_LINE }}</p>
    </div>

    <LandingStage />
  </section>
</template>

<script setup lang="ts">
// Hero of the landing v4 (prd-landing-v4 RF-L2, RF-L11; inspirations: Afiliou, Knowt): centered promise with the
// key words under a lilac highlighter, the one primary of the screen plus "Ver como funciona", the guarantees of
// the catalog, and the real app below. Every `?m=` variant is in the HTML; landing.css shows the one of html[data-m].
import { Check } from 'lucide-vue-next'
import type { CatalogTrial } from '~/types'
import { AUDIENCE_LINE, HERO_VARIANTS, landingGuarantees } from '~/utils/landing'

defineProps<{ trial: CatalogTrial | null }>()
const emit = defineEmits<{ cta: [] }>()
</script>
