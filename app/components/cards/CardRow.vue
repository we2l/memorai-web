<template>
  <li class="content-auto flex items-start gap-3 px-3 py-3" :class="selected && 'bg-action-subtle'" data-testid="card-row">
    <!-- The label stretches the 20 px box to a 44 px touch area without moving it (prd-responsividade RF-3) -->
    <label class="-m-3 flex shrink-0 cursor-pointer p-3">
      <input
        type="checkbox"
        class="mt-1 size-5 shrink-0 cursor-pointer accent-action"
        :checked="selected"
        :aria-label="`Selecionar: ${front}`"
        @click="(e: MouseEvent) => $emit('toggle', e.shiftKey)"
      >
    </label>
    <button
      ref="button"
      type="button"
      class="min-w-0 flex-1 rounded-row text-left"
      data-testid="card-row-open"
      @click="$emit('open')"
      @keydown.space.prevent="$emit('toggle', false)"
    >
      <span class="line-clamp-2 block text-body text-fg-strong">{{ front }}</span>
      <span class="block truncate text-meta text-fg-muted">{{ back }}</span>
      <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-fg-muted">
        <UiTag v-if="card.suspended_at" tone="neutral" data-testid="card-row-paused">Pausado</UiTag>
        <UiTag v-else :tone="state.tone">{{ state.label }}</UiTag>
        <span v-if="card.is_leech" data-testid="card-row-leech">não está colando ({{ card.lapses }} erros)</span>
        <span v-if="origin" class="truncate">{{ origin }}</span>
        <span v-if="due">{{ due }}</span>
      </span>
    </button>
  </li>
</template>

<script setup lang="ts">
// A light row of the library (prd-4c-material-v3 RF-F11): ≤ 12 elements (checkbox, the question in 2 lines,
// the answer in 1, the state in words, the short origin and the due date), plain text (no HTML to parse
// per row) and `content-auto` (rows off screen skip style, layout and paint). Space on the row marks it;
// Shift+click on the box marks a range; a click or Enter opens the card.
import type { LibraryCard } from '~/types'
import { cardState, dueLabel, originShort } from '~/utils/cardState'
import { htmlToPlain } from '~/utils/html'

const props = defineProps<{ card: LibraryCard; selected: boolean }>()
defineEmits<{ (e: 'toggle', range: boolean): void; (e: 'open'): void }>()

const front = computed(() => htmlToPlain(props.card.front) || 'Card sem texto')
const back = computed(() => htmlToPlain(props.card.back))
const state = computed(() => cardState(props.card))
const due = computed(() => (state.value.standing === 'new' ? '' : dueLabel(props.card)))
const origin = computed(() => originShort(props.card.origin))

const button = ref<HTMLButtonElement | null>(null)
defineExpose({ focus: () => button.value?.focus() })
</script>
