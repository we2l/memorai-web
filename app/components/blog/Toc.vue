<template>
  <div>
    <details class="rounded-card bg-raised px-5 shadow-1 xl:hidden">
      <summary class="flex min-h-touch cursor-pointer items-center text-meta font-semibold text-fg-strong">Neste artigo</summary>
      <ol class="flex list-decimal flex-col gap-1 pb-4 pl-5 text-meta text-fg">
        <li v-for="s in items" :key="s.id"><UiLink :href="`#${s.id}`" variant="muted">{{ s.title }}</UiLink></li>
      </ol>
    </details>
    <nav aria-label="Neste artigo" class="sticky top-6 hidden xl:block">
      <p class="mb-3 text-label text-fg-muted">Neste artigo</p>
      <ol class="flex list-decimal flex-col gap-2 pl-5 text-meta text-fg">
        <li v-for="s in items" :key="s.id"><UiLink :href="`#${s.id}`" variant="muted">{{ s.title }}</UiLink></li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Table of contents of an article (RF-B7), the same pattern as LegalLayout: collapsible on the phone, sticky from 1280 px
defineProps<{ items: { id: string, title: string }[] }>()
</script>
