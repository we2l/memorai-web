<template>
  <section class="bg-raised px-gutter py-14 lg:py-20" aria-labelledby="landing-segments">
    <div class="mx-auto max-w-page">
      <h2 id="landing-segments" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Para o que você estuda</h2>
      <p class="mt-3 max-w-prose text-lead text-fg">Qualquer coisa que tenha prova. Uma tela de revisão de cada área, na conta de demonstração.</p>
      <!-- Phone: a row that slides sideways (snap), so 5 screens do not stack into a long scroll; md+: a grid -->
      <ul
        class="-mx-gutter mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-gutter pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        tabindex="0"
        aria-label="Áreas de estudo, uma tela de cada"
      >
        <li
          v-for="s in SEGMENTS"
          :key="s.name"
          class="flex w-72 shrink-0 snap-start flex-col gap-5 rounded-card p-5 ring-1 sm:p-6 md:w-auto"
          :class="s.featured ? 'bg-tinted ring-action-subtle md:col-span-2 md:grid md:grid-cols-2 md:items-center' : 'bg-page ring-line'"
          data-testid="landing-segment"
        >
          <div>
            <h3 class="flex items-center gap-2.5 text-section text-fg-strong">
              <span class="size-2.5 shrink-0 rounded-full" :class="s.dot" aria-hidden="true" />{{ s.name }}
            </h3>
            <p class="mt-2 text-body text-fg">{{ s.text }}</p>
          </div>
          <LandingShot :name="s.shot" />
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
// The areas as a gallery (prd-landing-v4 RF-L4; inspiration: Hubink): a real review screen and a sentence each,
// one card featured in the section's only lilac block. The subject dot is the identity color, small (ADR-027 §6).
import { SEGMENTS } from '~/utils/landing'
</script>
