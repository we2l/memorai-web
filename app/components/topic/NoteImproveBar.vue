<template>
  <div
    v-if="visible"
    class="mb-4 flex flex-wrap items-center gap-3 rounded-row px-4 py-2.5"
    :class="state === 'paywall' ? 'bg-warning-subtle' : 'bg-action-subtle'"
    :role="state === 'loading' ? 'status' : undefined"
    data-testid="note-improve-bar"
  >
    <!-- Idle: suggestion -->
    <template v-if="state === 'idle'">
      <p class="flex min-w-0 flex-1 items-center gap-2 text-meta text-fg-strong">
        <Sparkles class="size-4 shrink-0 text-action-fg" aria-hidden="true" />
        <span class="truncate">Essa nota pode ficar mais organizada</span>
      </p>
      <UiButton size="sm" @click="$emit('improve')">Melhorar com IA</UiButton>
      <UiIconButton :icon="X" label="Dispensar sugestão" size="sm" @click="$emit('dismiss')" />
    </template>

    <!-- Loading -->
    <p v-else-if="state === 'loading'" class="flex flex-1 items-center gap-2 text-meta text-fg-strong">
      <UiSpinner size="sm" /> Gerando a nota melhorada…
    </p>

    <!-- Preview -->
    <template v-else-if="state === 'preview'">
      <p class="flex min-w-0 flex-1 items-center gap-2 text-meta text-fg-strong">
        <Sparkles class="size-4 shrink-0 text-action-fg" aria-hidden="true" /> Nota melhorada: confira o texto abaixo.
      </p>
      <UiButton size="sm" @click="$emit('apply')">Aplicar melhoria</UiButton>
      <UiButton size="sm" variant="ghost" @click="$emit('discard')">Manter original</UiButton>
    </template>

    <!-- Paywall -->
    <template v-else-if="state === 'paywall'">
      <p class="flex min-w-0 flex-1 items-center gap-2 text-meta text-fg-strong">
        <Sparkles class="size-4 shrink-0 text-warning" aria-hidden="true" /> Melhore suas notas com IA
      </p>
      <UiButton size="sm" to="/planos">Ver planos</UiButton>
    </template>
  </div>
</template>

<script setup lang="ts">
// "Melhorar com IA" of the material (⋯ of the top bar): the generation, the preview to apply or discard,
// and the paywall. A line above the text, never a second primary.
import { Sparkles, X } from 'lucide-vue-next'

defineProps<{
  visible: boolean
  state: 'idle' | 'loading' | 'preview' | 'paywall'
}>()

defineEmits<{
  (e: 'improve'): void
  (e: 'apply'): void
  (e: 'discard'): void
  (e: 'dismiss'): void
}>()
</script>
