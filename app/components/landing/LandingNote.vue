<template>
  <div class="flex items-start gap-3 rounded-card bg-raised p-4 text-left shadow-card ring-1 ring-line">
    <UiPracticeIcon v-if="note.icon === 'review' || note.icon === 'quiz'" :mode="note.icon" size="sm" />
    <span v-else class="inline-flex size-7.5 shrink-0 items-center justify-center rounded-row bg-subtle" aria-hidden="true">
      <FileText class="size-3.5 text-fg-muted" />
    </span>
    <span>
      <span class="block text-meta font-semibold text-fg-strong">{{ note.title }}</span>
      <span class="block text-meta text-fg">{{ note.text }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
// One note around the app of the hero: the mode's icon (identity color only on the icon, ADR-027 §6) and a line.
import { FileText } from 'lucide-vue-next'
import type { ANNOTATIONS } from '~/utils/landing'

defineProps<{ note: typeof ANNOTATIONS[number] }>()
</script>
