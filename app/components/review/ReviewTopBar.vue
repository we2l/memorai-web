<template>
  <header class="border-b border-line bg-raised" data-testid="review-top">
    <div class="mx-auto flex max-w-page items-center gap-x-3 px-gutter py-2">
      <UiLink :to="backTo" variant="muted" class="inline-flex min-h-touch shrink-0 items-center gap-1 font-medium" data-testid="review-exit">
        <ChevronLeft class="size-4" aria-hidden="true" />Sair
      </UiLink>
      <p v-if="scopeText" class="hidden min-w-0 flex-1 truncate text-meta text-fg-muted sm:block" data-testid="review-scope">
        Revisando <span class="font-semibold text-fg-strong">{{ scopeText }}</span>{{ scopeNote ? ` ${scopeNote}` : '' }}
      </p>
      <span v-else class="hidden flex-1 sm:block" />

      <div v-if="batch" class="ml-auto flex items-center gap-3 sm:ml-0" data-testid="review-batch">
        <span class="text-meta font-medium whitespace-nowrap text-fg-strong tabular-nums">
          Lote {{ batch.index }} de {{ batch.total }}<span class="max-sm:hidden"> · card {{ batch.card }} de {{ batch.size }}</span><span class="sm:hidden"> · {{ batch.card }}/{{ batch.size }}</span>
        </span>
        <UiProgressBar v-if="batch.total <= MAX_SEGMENTS" class="hidden w-48 sm:flex" v-bind="barProps" />
      </div>
      <span v-else class="ml-auto sm:hidden" />
      <slot name="status" />

      <span class="flex shrink-0 items-center">
        <UiIconButton v-if="canUndo" :icon="Undo2" label="Desfazer (U)" size="sm" aria-keyshortcuts="U Control+Z" @click="$emit('undo')" />
        <UiIconButton v-if="canEdit" :icon="Pencil" label="Editar card (E)" size="sm" aria-keyshortcuts="E" @click="$emit('edit')" />
        <UiMenu :items="menu" label="Mais opções da revisão" />
      </span>
    </div>
    <!-- Phone: the path of the slice and the bar on a 2nd line -->
    <div v-if="scopeText || (batch && batch.total <= MAX_SEGMENTS)" class="flex flex-col gap-2 px-gutter pb-2.5 sm:hidden">
      <p v-if="scopeText" class="truncate text-label text-fg-muted">
        Revisando <span class="font-semibold text-fg-strong">{{ scopeText }}</span>{{ scopeNote ? ` ${scopeNote}` : '' }}
      </p>
      <UiProgressBar v-if="batch && batch.total <= MAX_SEGMENTS" v-bind="barProps" />
    </div>
  </header>
</template>

<script setup lang="ts">
// Calm top of the review (prd-4d-revisao-v3 RF-F2, RF-F11): "‹ Sair" back to the slice, "Revisando TRF 4ª
// Região (todas as matérias)" or the path of the slice, "Lote 1 de 3 · card 14 de 20" with one bar per
// batch (≤ 6 drawn), Desfazer, Editar and ⋯ (Modo foco, Atalhos, Relâmpago). On the phone the path goes
// to a 2nd line and the count shortens.
import { ChevronLeft, Pencil, Undo2 } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import { MAX_SEGMENTS, type BatchPosition } from '~/composables/useReviewBatches'

const props = defineProps<{
  backTo: string
  scopeText: string
  /** "(todas as matérias)" after a whole caderno */
  scopeNote?: string
  batch: BatchPosition | null
  canUndo: boolean
  canEdit: boolean
  blitzTo?: string | null
}>()
const emit = defineEmits<{ (e: 'undo'): void; (e: 'edit'): void; (e: 'focus-mode'): void; (e: 'shortcuts'): void }>()

const barProps = computed(() => {
  const b = props.batch!
  return {
    value: b.done,
    max: b.total,
    segments: b.total,
    size: 'md' as const,
    label: `Lote ${b.index} de ${b.total}, ${Math.round((b.done - (b.index - 1)) * 100)}% feito`,
    valueText: `Lote ${b.index} de ${b.total}`,
  }
})

const menu = computed<MenuItem[]>(() => [
  { label: 'Modo foco', meta: 'tela cheia', onSelect: () => emit('focus-mode') },
  { label: 'Atalhos', meta: '?', onSelect: () => emit('shortcuts') },
  ...(props.blitzTo ? [{ label: 'Relâmpago', meta: '5 min', to: props.blitzTo }] : []),
])
</script>
