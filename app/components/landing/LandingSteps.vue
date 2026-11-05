<template>
  <!-- The dark band of the page, in both themes, with no new color: the strong text color as ground in the light theme,
       the subtle surface (lighter than the page, still dark) in the dark one -->
  <section id="como-funciona" class="bg-fg-strong px-gutter py-14 text-page lg:py-20 dark:bg-subtle" aria-labelledby="landing-steps">
    <div class="mx-auto max-w-page">
      <h2 id="landing-steps" class="text-heading text-balance text-page lg:text-heading-lg dark:text-fg-strong">Como funciona</h2>
      <p class="mt-3 max-w-prose text-lead text-page/80 dark:text-fg">Do material à prova, em três passos. As telas são do app, numa conta de demonstração.</p>
      <ol class="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-8">
        <li v-for="(step, i) in STEPS" :key="step.title" class="flex flex-col">
          <h3 class="flex items-start gap-3 text-section text-page dark:text-fg-strong">
            <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-meta font-semibold text-on-action tabular-nums" aria-hidden="true">{{ i + 1 }}</span>
            <span class="pt-0.5">{{ step.title }}</span>
          </h3>
          <p class="mt-3 text-body text-page/80 dark:text-fg">{{ step.text }}</p>
          <div class="mt-6 w-full">
            <LandingShot :name="step.shot" />
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
// "Como funciona" (prd-landing-v4 RF-L3): a real sequence, so the numbers stay; each step shows the part of the
// real screen it talks about, large enough to read on a phone.
import { STEPS } from '~/utils/landing'
</script>
