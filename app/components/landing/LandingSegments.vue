<template>
  <section class="px-gutter py-12 lg:py-24" aria-labelledby="landing-segments">
    <div class="mx-auto max-w-page">
      <h2 id="landing-segments" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Para o que você estuda</h2>
      <p class="mt-3 max-w-prose text-lead text-fg">Escolha a área e veja um card de exemplo, do jeito que ele aparece na revisão.</p>

      <fieldset class="mt-6">
        <legend class="sr-only">Área de estudo</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="(s, i) in SEGMENTS"
            :key="s.name"
            class="relative inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-raised px-4 text-meta font-semibold text-fg transition-colors duration-nav hover:text-fg-strong has-checked:border-action-fg has-checked:bg-action-subtle has-checked:text-fg-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus motion-reduce:transition-none"
          >
            <input v-model="selected" type="radio" :name="name" :value="i" class="absolute inset-0 cursor-pointer appearance-none rounded-full outline-none" data-testid="landing-segment">
            <span class="size-2.5 shrink-0 rounded-full" :class="s.dot" aria-hidden="true" />
            {{ s.name }}
          </label>
        </div>
      </fieldset>

      <!-- Every area stays in the HTML (prerender, search engines); the chosen one shows -->
      <div class="mt-6 rounded-card bg-raised p-6 shadow-card" aria-live="polite">
        <div v-for="(s, i) in SEGMENTS" v-show="selected === i" :key="s.name" class="grid gap-5 lg:grid-cols-2 lg:gap-12" data-testid="landing-segment-panel">
          <div>
            <h3 class="text-section text-fg-strong">{{ s.name }}</h3>
            <p class="mt-2 text-body text-fg">{{ s.text }}</p>
          </div>
          <figure class="rounded-control bg-subtle p-4">
            <figcaption class="text-label text-fg-muted">Card de exemplo</figcaption>
            <p class="mt-2 text-body font-semibold text-fg-strong">{{ s.front }}</p>
            <p class="mt-2 border-t border-line pt-2 text-body text-fg">{{ s.back }}</p>
          </figure>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// The areas (prd-landing-v4 RF-L4): native radios as chips (arrows and group name from the browser, like
// plans/BillingToggle), one panel at a time with how the area uses the app and a true example card. The subject
// dot is the only identity color (ADR-027 §6: small, never a fill). `?m=` picks the area of the video.
import { SEGMENTS, type LandingMessage } from '~/utils/landing'

const props = defineProps<{ message: LandingMessage }>()

const name = useId()
const BY_MESSAGE: Partial<Record<LandingMessage, number>> = { faculdade: 1, ingles: 4 }
const selected = ref(0)
watch(() => props.message, (m) => { selected.value = BY_MESSAGE[m] ?? 0 })
</script>
