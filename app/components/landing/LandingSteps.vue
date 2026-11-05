<template>
  <section id="como-funciona" class="px-gutter py-12 lg:py-24" aria-labelledby="landing-steps">
    <div class="mx-auto max-w-page">
      <h2 id="landing-steps" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Como funciona</h2>
      <ol class="mt-10 flex flex-col gap-16 lg:gap-24">
        <li v-for="(step, i) in STEPS" :key="step.title" class="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
          <div :class="i % 2 ? 'lg:order-2' : ''">
            <h3 class="flex items-start gap-3 text-section text-fg-strong lg:text-heading">
              <span class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action-subtle text-meta font-semibold text-action-fg tabular-nums" aria-hidden="true">{{ i + 1 }}</span>
              {{ step.title }}
            </h3>
            <p class="mt-4 max-w-prose text-lead text-fg">{{ step.text }}</p>
          </div>
          <div class="mx-auto w-full max-w-75 lg:max-w-90">
            <LandingShot :name="step.shot" />
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
// "Como funciona" (prd-landing-v4 RF-L3): a real sequence, so the numbers stay; each step shows the real screen.
import { STEPS } from '~/utils/landing'
</script>
