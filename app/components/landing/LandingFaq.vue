<template>
  <section class="px-gutter py-12 lg:py-24" aria-labelledby="landing-faq">
    <div class="mx-auto max-w-3xl">
      <h2 id="landing-faq" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Perguntas frequentes</h2>
      <div class="mt-8 divide-y divide-line rounded-card bg-raised px-5 shadow-card sm:px-6">
        <details v-for="faq in items" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-3 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-nav group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <p class="pb-4 text-body text-fg">{{ faq.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Questions of the landing v4 (prd-landing-v4 RF-L8, §5.1): no number; the free answer follows the catalog's trial.
import { ChevronDown } from 'lucide-vue-next'
import type { CatalogTrial } from '~/types'
import { landingFaqs } from '~/utils/landing'

const props = defineProps<{ trial: CatalogTrial | null }>()
const items = computed(() => landingFaqs(props.trial))
</script>
