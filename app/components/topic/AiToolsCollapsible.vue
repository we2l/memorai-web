<template>
  <div class="mx-4 mt-3 mb-2 flex items-center gap-2">
    <button
      class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-base hover:border-[var(--color-accent-primary)]/20 hover:bg-surface-secondary transition-all text-left"
      @click="$emit('podcast')"
    >
      <Headphones :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
      <span class="text-small font-medium text-base-primary truncate">Podcast</span>
      <ChevronRight :size="12" class="text-base-muted/40 shrink-0 ml-auto" />
    </button>

    <button
      class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-base hover:border-[var(--color-accent-primary)]/20 hover:bg-surface-secondary transition-all text-left"
      @click="$emit('quiz')"
    >
      <ClipboardList :size="16" class="text-[var(--color-accent-soft)] shrink-0" />
      <span class="text-small font-medium text-base-primary truncate">Simulado</span>
      <ChevronRight :size="12" class="text-base-muted/40 shrink-0 ml-auto" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Headphones, ClipboardList, ChevronRight } from 'lucide-vue-next'

defineEmits<{
  (e: 'podcast'): void
  (e: 'quiz'): void
}>()
</script>
