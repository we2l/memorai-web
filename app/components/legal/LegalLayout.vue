<template>
  <div class="mx-auto max-w-page px-gutter pt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:pt-12">
    <!-- Index: collapsible on the phone, sticky on the desktop -->
    <aside class="mb-6 lg:mb-0">
      <details class="rounded-card bg-raised px-5 shadow-1 lg:hidden">
        <summary class="flex min-h-touch cursor-pointer items-center text-meta font-semibold text-fg-strong">Índice</summary>
        <ol class="flex list-decimal flex-col gap-1 pb-4 pl-5 text-meta text-fg">
          <li v-for="s in sections" :key="s.id"><UiLink :href="`#${s.id}`" variant="muted">{{ s.title }}</UiLink></li>
        </ol>
      </details>
      <nav aria-label="Índice" class="sticky top-6 hidden lg:block">
        <p class="mb-3 text-label text-fg-muted">Índice</p>
        <ol class="flex list-decimal flex-col gap-2 pl-5 text-meta text-fg">
          <li v-for="s in sections" :key="s.id"><UiLink :href="`#${s.id}`" variant="muted">{{ s.title }}</UiLink></li>
        </ol>
      </nav>
    </aside>

    <article id="topo" class="legal-prose max-w-prose">
      <h1 class="mb-2 text-page-title text-fg-strong">{{ title }}</h1>
      <p class="mb-8 text-meta text-fg-muted">Vigência a partir de {{ effectiveDate }} · Última atualização: {{ updatedAt }}</p>
      <slot />
      <p class="mt-12 text-meta">
        <a href="#topo" class="hit-touch">Voltar ao topo</a>
      </p>
    </article>
  </div>
</template>

<script setup lang="ts">
// Reading layout of /termos and /privacidade (prd-4h-landing-v3 RF-F14). The shell is layouts/public.vue; the
// legal text stays where it is and untouched, and gets its typography from legal-prose.css (no <style>).
import '~/assets/css/legal-prose.css'

defineProps<{
  title: string
  effectiveDate: string
  updatedAt: string
  sections: { id: string; title: string }[]
}>()
</script>
