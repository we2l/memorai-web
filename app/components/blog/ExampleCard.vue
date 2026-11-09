<template>
  <figure class="overflow-hidden rounded-card bg-raised shadow-1" aria-label="Exemplo de card">
    <div class="border-b border-hairline px-5 py-4">
      <p class="mb-1 text-label text-fg-muted">Frente</p>
      <p class="text-body font-semibold text-fg-strong">{{ q }}</p>
    </div>
    <div class="px-5 py-4">
      <p class="mb-1 text-label text-fg-muted">Verso</p>
      <p class="text-body text-fg">{{ a }}</p>
    </div>
    <figcaption v-if="source" class="bg-soft px-5 py-2 text-meta text-fg-muted">Fonte: {{ source }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
// An example card inside the text (RF-B10): both faces visible, with the source
defineProps<{ q: string, a: string, source?: string }>()
</script>
