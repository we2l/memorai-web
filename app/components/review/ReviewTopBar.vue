<template>
  <header class="border-b border-line bg-raised" data-testid="review-top">
    <div class="mx-auto flex max-w-page flex-wrap items-center gap-x-3 px-gutter py-2 max-sm:pb-1">
      <UiLink v-if="!onboarding" :to="backTo" variant="muted" class="inline-flex min-h-touch shrink-0 items-center gap-1 font-medium" data-testid="review-exit">
        <ChevronLeft class="size-4" aria-hidden="true" />Sair
      </UiLink>
      <!-- First review of the onboarding: the logo and the step, no scope (prd-4g RF-F5) -->
      <div v-if="onboarding" class="flex min-w-0 flex-1 items-center gap-3" data-testid="review-onboarding">
        <UiLogo :icon-size="24" text-class="text-body text-fg-strong max-sm:hidden" />
        <span class="text-meta whitespace-nowrap text-fg-muted" data-testid="review-step">{{ stepLabel }}</span>
      </div>
      <p v-else-if="scopeText" class="order-last w-full truncate text-label text-fg-muted sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:text-meta" data-testid="review-scope">
        Revisando <span class="font-semibold text-fg-strong">{{ scopeText }}</span>{{ scopeNote ? ` ${scopeNote}` : '' }}
      </p>
      <span v-else class="hidden flex-1 sm:block" />

      <div v-if="batch" class="ml-auto flex items-center gap-3 sm:ml-0" data-testid="review-batch">
        <span class="text-meta font-medium whitespace-nowrap text-fg-strong tabular-nums">
          <!-- A single batch (the visitor's mini-lote) has no "Lote 1 de 1" -->
          <template v-if="batch.total > 1">Lote {{ batch.index }} de {{ batch.total }} · </template><span class="max-sm:hidden">card {{ batch.card }} de {{ batch.size }}</span><span class="sm:hidden">{{ batch.total > 1 ? '' : 'card ' }}{{ batch.card }}/{{ batch.size }}</span>
        </span>
        <UiProgressBar v-if="batch.total <= MAX_SEGMENTS" class="hidden w-48 sm:flex" v-bind="barProps" />
      </div>
      <span v-else class="ml-auto sm:hidden" />
      <slot name="status" />

      <span class="flex shrink-0 items-center">
        <UiIconButton v-if="canUndo" :icon="Undo2" label="Desfazer (U)" size="sm" aria-keyshortcuts="U Control+Z" @click="$emit('undo')" />
        <UiIconButton v-if="canEdit" :icon="Pencil" label="Editar card (E)" size="sm" aria-keyshortcuts="E" @click="$emit('edit')" />
        <UiMenu v-if="!onboarding" :items="menu" label="Mais opções da revisão" />
        <!-- The onboarding leaves by a quiet X at the end, not a "Sair" competing with the card (prd-revisao-v5-fase-a RF-F7) -->
        <UiIconButton v-else :icon="X" :to="backTo" :label="exitLabel" size="sm" data-testid="review-exit" />
      </span>
    </div>
    <!-- Phone: the path of the slice goes to a 2nd line (above) and the bar to a 3rd -->
    <div v-if="batch && batch.total <= MAX_SEGMENTS" class="px-gutter pb-2.5 sm:hidden">
      <UiProgressBar v-bind="barProps" />
    </div>
  </header>
</template>

<script setup lang="ts">
// Calm top of the review (prd-4d-revisao-v3 RF-F2, RF-F11): "‹ Sair" back to the slice, "Revisando TRF 4ª
// Região (todas as matérias)" or the path of the slice, "Lote 1 de 3 · card 14 de 20" with one bar per
// batch (≤ 6 drawn), Desfazer, Editar and ⋯ (Modo foco, Atalhos, Relâmpago). On the phone the path goes
// to a 2nd line and the count shortens.
import { ChevronLeft, Pencil, Undo2, X } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import { MAX_SEGMENTS, type BatchPosition } from '~/composables/useReviewBatches'

const props = withDefaults(defineProps<{
  backTo: string
  scopeText: string
  /** "(todas as matérias)" after a whole caderno */
  scopeNote?: string
  batch: BatchPosition | null
  canUndo: boolean
  canEdit: boolean
  blitzTo?: string | null
  onboarding?: boolean
  /** Next to the logo of the onboarding: "Passo 3 de 3" (v3) or "Exemplo de OAB" (the visitor's mini-lote, v4) */
  stepLabel?: string
  /** The name of the onboarding's X */
  exitLabel?: string
}>(), { scopeNote: undefined, blitzTo: undefined, stepLabel: 'Passo 3 de 3', exitLabel: 'Sair' })
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
