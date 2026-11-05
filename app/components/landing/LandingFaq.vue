<template>
  <section class="bg-raised px-gutter py-14 lg:py-20" aria-labelledby="landing-faq">
    <div class="mx-auto grid max-w-page gap-8 lg:grid-cols-3 lg:gap-16">
      <div>
        <h2 id="landing-faq" class="text-heading text-balance text-fg-strong lg:text-heading-lg">Perguntas frequentes</h2>
        <p class="mt-3 text-body text-fg">
          Não achou a sua? Escreva para <UiLink href="mailto:contato@baigi.com.br">contato@baigi.com.br</UiLink>.
        </p>
      </div>
      <div class="divide-y divide-line border-y border-line lg:col-span-2">
        <details v-for="faq in items" :key="faq.q" class="group">
          <summary class="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 py-4 text-body font-semibold text-fg-strong">
            {{ faq.q }}
            <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-nav group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <p class="pb-5 text-body text-fg">{{ faq.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Questions of the landing v4 (prd-landing-v4 RF-L8, §5.1), in two columns on the desktop (inspiration: Afiliou).
// No number; the free answer follows the catalog's trial.
import { ChevronDown } from 'lucide-vue-next'
import type { CatalogTrial } from '~/types'
import { landingFaqs } from '~/utils/landing'

const props = defineProps<{ trial: CatalogTrial | null }>()
const items = computed(() => landingFaqs(props.trial))
</script>
