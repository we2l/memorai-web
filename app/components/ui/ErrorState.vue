<template>
  <div
    role="alert"
    class="flex flex-col items-center justify-center text-center"
    :class="variantClass"
  >
    <div class="w-12 h-12 rounded-2xl bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] flex items-center justify-center mb-3">
      <CloudOff class="w-6 h-6" aria-hidden="true" />
    </div>
    <p class="font-semibold text-base-primary" :class="variant === 'page' ? 'text-lg' : 'text-small'">
      {{ title }}
    </p>
    <p v-if="description" class="text-small text-base-muted mt-1 max-w-sm">{{ description }}</p>
    <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
      <button type="button" class="btn-secondary min-h-[44px]" @click="$emit('retry')">
        <RotateCw class="w-4 h-4" aria-hidden="true" />
        Tentar de novo
      </button>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CloudOff, RotateCw } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  variant?: 'inline' | 'page' | 'hero'
}>(), {
  title: 'Não foi possível carregar',
  description: undefined,
  variant: 'inline',
})

defineEmits<{ (e: 'retry'): void }>()

const variantClass = computed(() => ({
  inline: 'card p-6',
  page: 'min-h-[50vh] px-6 py-12',
  hero: 'card p-8 min-h-[320px]',
}[props.variant]))
</script>
