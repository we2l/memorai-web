<template>
  <nav aria-label="Partes do material" class="flex flex-col gap-6" data-testid="material-outline">
    <div v-if="parts.length">
      <h2 class="mb-2 px-3 text-label font-semibold text-fg-muted">
        Partes<template v-if="pages"> ({{ pages }} p.)</template>
      </h2>
      <ul class="flex flex-col gap-0.5">
        <li v-for="part in parts" :key="part.note_id">
          <UiListRow
            :to="cadernoPath(topicId, { note: part.note_id })"
            :active="part.note_id === currentNoteId"
            :title="`${part.index} · ${part.title}`"
            :meta="partMeta(part)"
          />
        </li>
      </ul>
    </div>

    <div v-if="headings.length">
      <h2 class="mb-2 px-3 text-label font-semibold text-fg-muted">{{ parts.length ? 'Nesta parte' : 'Nesta nota' }}</h2>
      <ul class="flex flex-col">
        <li v-for="h in headings" :key="h.index">
          <button
            type="button"
            class="flex min-h-touch w-full items-center rounded-row py-1.5 pr-3 text-left text-meta transition-colors duration-nav hover:bg-subtle"
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
// Sumário of the material (prd-4c-material-v3 RF-F3): the parts of the PDF (4c-1: a PDF is one part) with
// their cards and mastery, the open one marked, and "Nesta parte", the H1–H3 of the open note (from the
// JSON already loaded; the heading on screen is marked while the reader scrolls). A manual note without
// headings shows nothing here.
import type { MaterialPart } from '~/types'
import type { OutlineHeading } from '~/composables/useNoteOutline'

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

function partMeta(part: MaterialPart): string {
  if (part.status === 'generating' || part.status === 'processing') return 'gerando nota…'
  if (part.status === 'failed') return 'não deu para ler esta parte'
  const pages = part.page_start ? `p. ${part.page_start}${part.page_end && part.page_end !== part.page_start ? `–${part.page_end}` : ''} · ` : ''
  if (!part.cards) return `${pages}sem cards ainda`
  return `${pages}${part.cards} ${part.cards === 1 ? 'card' : 'cards'}${part.mastery != null ? ` · ${part.mastery}%` : ''}`
}
</script>
