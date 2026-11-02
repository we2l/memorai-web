<template>
  <div
    class="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--miniplayer-h))] z-sticky border-t border-line bg-raised shadow-raised md:bottom-[calc(var(--miniplayer-h)+16px)] md:mx-auto md:max-w-3xl md:rounded-card md:border"
    role="region"
    aria-label="Cards selecionados"
    data-testid="card-selection"
  >
    <div class="flex flex-wrap items-center gap-2 px-gutter py-3">
      <p class="mr-auto text-meta font-semibold text-fg-strong" aria-live="polite">{{ count }} {{ count === 1 ? 'selecionado' : 'selecionados' }}</p>
      <UiButton size="sm" variant="ghost" @click="$emit('toggle-all')">{{ allSelected ? 'Desmarcar todos' : 'Selecionar todos desta página' }}</UiButton>
      <UiButton
        size="sm"
        :to="reviewTo ?? undefined"
        :disabled="!reviewTo"
        :aria-describedby="reviewTo ? undefined : limitId"
        data-testid="card-selection-review"
        @click="reviewTo && $emit('review')"
      >
        Revisar
      </UiButton>
      <UiButton size="sm" variant="danger" data-testid="card-selection-delete" @click="$emit('delete')">Excluir</UiButton>
      <UiIconButton :icon="X" label="Limpar seleção" size="sm" @click="$emit('clear')" />
      <p v-if="!reviewTo" :id="limitId" class="w-full text-label text-fg-muted">Revise até {{ REVIEW_SELECTION_MAX }} de uma vez.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Actions on the selected cards of the library (prd-4c-material-v3 RF-F12): review them (a session of those
// ids, ≤ 100) or delete them (definitive, confirmed with the number). "Mover para…" comes with the 4b-2.
import { X } from 'lucide-vue-next'
import { REVIEW_SELECTION_MAX } from '~/composables/useCardLibrary'

defineProps<{ count: number; allSelected: boolean; reviewTo: string | null }>()
defineEmits<{ (e: 'toggle-all'): void; (e: 'review'): void; (e: 'delete'): void; (e: 'clear'): void }>()

const limitId = useId()
</script>
