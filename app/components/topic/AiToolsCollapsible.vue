<template>
  <div class="mx-4 mt-4 mb-3">
    <div class="grid grid-cols-2 gap-3">
      <!-- Podcast card -->
      <button
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/20 hover:shadow-md transition-all text-left"
        @click="$emit('podcast')"
      >
        <Headphones :size="20" class="text-base-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-small font-semibold text-base-primary">Podcast</p>
          <p class="text-micro text-base-muted truncate">Revisar ouvindo seus erros</p>
        </div>
        <ChevronRight :size="14" class="text-base-muted/40 shrink-0" />
      </button>

      <!-- Simulado card -->
      <button
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-base shadow-sm hover:border-[var(--color-accent-primary)]/20 hover:shadow-md transition-all text-left"
        @click="$emit('quiz')"
      >
        <ClipboardList :size="20" class="text-base-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-small font-semibold text-base-primary">Simulado</p>
          <p class="text-micro text-base-muted truncate">Testar com questões da IA</p>
        </div>
        <ChevronRight :size="14" class="text-base-muted/40 shrink-0" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Headphones, ClipboardList, ChevronRight } from 'lucide-vue-next'

defineEmits<{
  (e: 'podcast'): void
  (e: 'quiz'): void
}>()
</script>
