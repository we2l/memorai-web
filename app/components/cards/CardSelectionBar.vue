<template>
  <div
    class="fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--miniplayer-h))] z-sticky bg-raised shadow-float md:bottom-[calc(var(--miniplayer-h)+16px)] md:mx-auto md:max-w-3xl md:rounded-sheet"
    role="region"
    aria-label="Cards selecionados"
    data-testid="card-selection"
  >
    <div class="flex flex-wrap items-center gap-2 px-gutter-safe py-3">
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
        Revisar {{ count }}
      </UiButton>
      <UiButton
        size="sm"
        :disabled="count > MOVE_SELECTION_MAX"
        :aria-describedby="count > MOVE_SELECTION_MAX ? moveLimitId : undefined"
        data-testid="card-selection-move"
        @click="$emit('move')"
      >
        Mover
      </UiButton>
      <UiButton size="sm" variant="danger" data-testid="card-selection-delete" @click="$emit('delete')">Excluir</UiButton>
      <UiIconButton :icon="X" label="Limpar seleção" size="sm" @click="$emit('clear')" />
      <p v-if="!reviewTo" :id="limitId" class="w-full text-label text-fg-muted">Revise até {{ REVIEW_SELECTION_MAX }} de uma vez.</p>
      <p v-if="count > MOVE_SELECTION_MAX" :id="moveLimitId" class="w-full text-label text-fg-muted">Mova até {{ MOVE_SELECTION_MAX }} de uma vez.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Actions on the selected cards of the library (prd-4c-material-v3 RF-F12): review them (a session of those
// ids, ≤ 100), move them (≤ 500, prd-4b-caderno-v3 RF-F15) or delete them (definitive, confirmed with the number).
import { X } from 'lucide-vue-next'
import { MOVE_SELECTION_MAX, REVIEW_SELECTION_MAX } from '~/composables/useCardLibrary'

defineProps<{ count: number; allSelected: boolean; reviewTo: string | null }>()
defineEmits<{ (e: 'toggle-all' | 'review' | 'move' | 'delete' | 'clear'): void }>()

const limitId = useId()
const moveLimitId = useId()
</script>
