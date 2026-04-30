<template>
  <div class="px-4 pt-4 pb-4">
    <div class="flex items-center gap-2 mb-4">
      <button class="btn-secondary !py-2 !px-3.5 !min-h-[2.75rem] text-small" @click="$emit('create-note')">
        <FilePlus :size="14" /> Nova nota
      </button>
    </div>

    <div v-if="notes.length" class="space-y-2">
      <button
        v-for="note in notes"
        :key="note.id"
        class="w-full text-left px-4 py-3 rounded-xl bg-surface-tertiary/50 hover:bg-surface-tertiary transition-colors flex items-center gap-3 group"
        @click="$emit('open-note', note)"
      >
        <FilePlus :size="18" class="text-base-muted shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-body font-medium text-base-primary truncate">{{ note.title }}</p>
          <div class="flex items-center gap-2 text-small text-base-muted">
            <span>{{ formatDate(note.updated_at) }}</span>
            <span v-if="cardsFromNote(note.id) > 0" class="text-accent-primary">· {{ cardsFromNote(note.id) }} cards</span>
          </div>
        </div>
        <ChevronRight :size="16" class="text-base-muted shrink-0" />
      </button>
    </div>
    <div v-else class="text-center py-8">
      <p class="text-body text-base-muted mb-3">Adicione notas ou suba um PDF pra começar</p>
      <button class="btn-primary !py-2 !px-4 !min-h-[2.75rem] text-small" @click="$emit('create-note')">Criar primeira nota</button>
    </div>

    <!-- PDFs -->
    <div class="mt-4 pt-4 border-t border-base">
      <p class="text-small font-medium text-base-secondary mb-2">Material</p>
      <slot name="documents" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FilePlus, ChevronRight } from 'lucide-vue-next'
import type { Note } from '~/types'

defineProps<{
  notes: Note[]
  cardsFromNote: (noteId: string) => number
}>()

defineEmits<{
  (e: 'create-note'): void
  (e: 'open-note', note: Note): void
}>()

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>
