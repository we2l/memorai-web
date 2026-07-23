<template>
  <div
    v-if="!dismissed"
    class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-small"
    :class="variantClasses"
  >
    <span v-if="icon" class="shrink-0 text-base">{{ icon }}</span>
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
    >
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon?: string
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
    case 'warning': return 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
    case 'success': return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
    case 'accent': return 'bg-[#F5F2FF] text-[#6F3FF5] dark:bg-[#6F3FF5]/10 dark:text-[#B794F4] border border-[#D7DDF2] dark:border-[#6F3FF5]/30'
    default: return 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40'
  }
})

const actionClasses = computed(() => {
  switch (props.variant) {
    case 'warning': return 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-800/30 dark:text-amber-200'
    case 'success': return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-800/30 dark:text-emerald-200'
    case 'accent': return 'bg-[#6F3FF5]/10 hover:bg-[#6F3FF5]/20 text-[#6F3FF5] dark:bg-[#6F3FF5]/20 dark:text-[#B794F4]'
    default: return 'bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-800/30 dark:text-blue-200'
  }
})
</script>
