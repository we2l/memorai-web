<template>
  <div role="alert" class="flex flex-col items-center justify-center text-center" :class="VARIANTS[variant]">
    <span class="mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-danger-subtle text-danger">
      <CloudOff class="h-6 w-6" aria-hidden="true" />
    </span>
    <p class="font-semibold text-fg-strong" :class="variant === 'inline' ? 'text-meta' : 'text-body'">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-meta text-fg-muted">{{ description }}</p>
    <div class="mt-4 flex flex-wrap items-center justify-center gap-2">
      <UiButton :icon-left="RotateCw" @click="emit('retry')">Tentar de novo</UiButton>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Error state (raio-X §D, tasks 12.4, rewritten on UiButton and the tokens): says what happened and
// offers to try again. Same API as before (title, description, variant, @retry, #actions).
import { CloudOff, RotateCw } from 'lucide-vue-next'

withDefaults(defineProps<{
  title?: string
  description?: string
  variant?: 'inline' | 'page' | 'hero'
}>(), {
  title: 'Não foi possível carregar',
  description: undefined,
  variant: 'inline',
})

const emit = defineEmits<{ (e: 'retry'): void }>()

const VARIANTS = {
  inline: 'rounded-card bg-raised p-6 shadow-1',
  page: 'min-h-96 px-6 py-12',
  hero: 'min-h-80 rounded-card bg-raised p-8 shadow-1',
}
</script>
