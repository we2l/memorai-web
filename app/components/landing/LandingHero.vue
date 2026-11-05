<template>
  <section class="px-gutter pt-8 pb-16 lg:pt-16 lg:pb-24" aria-labelledby="landing-title" data-ds-scope>
    <div class="mx-auto grid max-w-page items-center gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
      <div class="max-w-xl">
        <h1 id="landing-title" class="text-hero text-balance text-fg-strong lg:text-hero-lg">
          <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.title }}</span>
        </h1>
        <p class="mt-5 text-lead text-pretty text-fg">
          <span v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">{{ v.lead }}</span>
        </p>
        <div class="mt-8" data-landing="hero-cta">
          <UiButton variant="primary" to="/criar-conta" class="w-full sm:w-auto sm:px-8" data-testid="landing-hero-cta" @click="emit('cta')">
            Criar conta grátis
          </UiButton>
        </div>
        <!-- Room for the longest text: the trial of the catalog arrives after the first paint, without moving the page -->
        <p class="mt-3 min-h-15 text-meta text-fg-muted sm:min-h-10" data-testid="landing-free-line">{{ landingFreeLine(trial) }} {{ AUDIENCE_LINE }}</p>
      </div>

      <div class="mx-auto w-full max-w-75 lg:max-w-none">
        <div v-for="v in HERO_VARIANTS" :key="v.key" :data-m-variant="v.key">
          <LandingShot :name="v.shot" :priority="v.key === 'padrao'" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Hero of the landing v4 (prd-landing-v4 RF-L2, RF-L11): the promise, the one primary of the first screen and a
// real screen of the app. Every `?m=` variant is in the HTML; landing.css shows the one of html[data-m].
import type { CatalogTrial } from '~/types'
import { AUDIENCE_LINE, HERO_VARIANTS, landingFreeLine } from '~/utils/landing'

defineProps<{ trial: CatalogTrial | null }>()
const emit = defineEmits<{ cta: [] }>()
</script>
