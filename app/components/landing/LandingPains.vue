<template>
  <section class="px-gutter py-12 lg:py-24" aria-labelledby="landing-pains">
    <div class="mx-auto max-w-page">
      <h2 id="landing-pains" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Isso soa familiar?</h2>
      <ul class="mt-8 grid gap-4 lg:grid-cols-3">
        <li v-for="item in PAINS" :key="item.pain" class="flex flex-col gap-4 rounded-card bg-raised p-6 shadow-card">
          <p class="text-section text-pretty text-fg-strong">“{{ item.pain }}”</p>
          <p class="text-body text-fg">{{ item.answer }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
// "Isso soa familiar?" (prd-landing-v4): the three pains students write about, in their words (paraphrased from
// the research, never attributed to a person), each with what the product does about it.
import { PAINS } from '~/utils/landing'
</script>
