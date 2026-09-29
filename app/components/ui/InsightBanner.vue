<template>
  <div
    v-if="!dismissed"
    class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-small"
    :class="variantClasses"
  >
    <slot name="icon">
      <component :is="icon" v-if="icon" :size="16" class="shrink-0" />
    </slot>
    <p class="flex-1 min-w-0 truncate sm:whitespace-normal">{{ text }}</p>
    <button
      v-if="actionLabel"
      class="shrink-0 px-3 py-1 rounded-lg font-medium text-small transition-colors"
      :class="actionClasses"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
    <button
      v-if="dismissible"
      class="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
      title="Fechar"
      @click="dismiss"
     aria-label="Fechar">
      <X :size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  icon?: Component
  text: string
  variant?: 'info' | 'warning' | 'success' | 'accent'
  dismissible?: boolean
  actionLabel?: string
  persistKey?: string
}>(), {
  variant: 'info',
  dismissible: false,
})

defineEmits<{
  (e: 'action'): void
  (e: 'dismiss'): void
}>()

const dismissed = ref(false)

// Check persisted dismiss
onMounted(() => {
  if (props.persistKey && import.meta.client) {
    const stored = localStorage.getItem(`insight-dismiss-${props.persistKey}`)
    if (stored) {
      const dismissedAt = new Date(stored)
      // Re-show after 7 days
      if (Date.now() - dismissedAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
        dismissed.value = true
      }
    }
  }
})

function dismiss() {
  dismissed.value = true
  if (props.persistKey && import.meta.client) {
    localStorage.setItem(`insight-dismiss-${props.persistKey}`, new Date().toISOString())
  }
}

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'warning': return 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--badge-warning-text)]/20'
    case 'success': return 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--badge-success-text)]/20'
    case 'accent': return 'bg-[var(--badge-primary-bg)] text-[var(--color-accent-primary)] dark:bg-[var(--color-accent-primary)]/10 border border-base dark:border-[var(--color-accent-primary)]/30'
    default: return 'bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--badge-info-text)]/20'
  }
})

const actionClasses = computed(() => {
  switch (props.variant) {
    case 'warning': return 'bg-[var(--badge-warning-bg)] hover:bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
    case 'success': return 'bg-[var(--badge-success-bg)] hover:bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]'
    case 'accent': return 'bg-[var(--color-accent-primary)]/10 hover:bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] dark:bg-[var(--color-accent-primary)]/20'
    default: return 'bg-[var(--badge-info-bg)] hover:bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]'
  }
})
</script>
