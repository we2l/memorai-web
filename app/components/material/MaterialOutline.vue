<template>
  <nav aria-label="Partes do material" class="flex flex-col gap-6" data-testid="material-outline">
    <div v-if="parts.length" class="rounded-card bg-raised p-2 shadow-1">
      <h2 class="flex items-baseline justify-between px-3 pt-2 pb-1.5 text-title text-fg-strong">
        Partes<span v-if="pages" class="text-label font-medium text-fg-muted">{{ pages }} p.</span>
      </h2>
      <ul class="flex flex-col gap-0.5">
        <li v-for="part in parts" :key="part.note_id">
          <UiListRow
            :to="cadernoPath(topicId, { note: part.note_id })"
            :active="part.note_id === currentNoteId"
            :title="`${part.index} · ${part.title}`"
            :meta="partMetaText(part)"
            data-testid="outline-part"
          />
          <UiProgressBar v-if="part.mastery !== null && part.cards > 0" class="-mt-1.5 mb-1.5 px-3" :value="part.mastery" :label="`Domínio da parte ${part.index}`" />
        </li>
      </ul>
    </div>

    <div v-if="headings.length">
      <h2 class="mb-1 px-3 text-label font-semibold text-fg-muted">{{ parts.length ? 'Nesta parte' : 'Nesta nota' }}</h2>
      <ul class="flex flex-col">
        <li v-for="h in headings" :key="h.index">
          <button
            type="button"
            class="flex min-h-touch w-full items-center rounded-row py-1.5 pr-3 text-left text-meta transition-colors duration-fast hover:bg-soft"
            :class="[INDENT[h.level], h.index === active ? 'font-semibold text-action-fg' : 'text-fg']"
            :aria-current="h.index === active ? 'location' : undefined"
            data-testid="outline-heading"
            @click="$emit('go', h)"
          >
            <span class="line-clamp-2">{{ h.text }}</span>
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
// Sumário of the material (prd-4c-material-v3 RF-F3, RF-F14): the parts of the PDF with their pages, cards and
// mastery ("p. 1–30 · 31 cards · 62%"), the state of the ones being written, the open one marked, and "Nesta parte", the H1–H3 of the open note (from the
// JSON already loaded; the heading on screen is marked while the reader scrolls). A manual note without
// headings shows nothing here.
import type { MaterialPart } from '~/types'
import type { OutlineHeading } from '~/composables/useNoteOutline'
import { partMetaText } from '~/utils/materialParts'

defineProps<{
  parts: MaterialPart[]
  pages?: number | null
  currentNoteId: string
  topicId: string
  headings: OutlineHeading[]
  active: number | null
}>()
defineEmits<{ (e: 'go', heading: OutlineHeading): void }>()

const INDENT = { 1: 'pl-3', 2: 'pl-6', 3: 'pl-9' } as const

</script>
