<template>
  <!-- role=radiogroup with roving tabindex and arrow keys (WAI-ARIA radio pattern) -->
  <div role="radiogroup" class="grid grid-cols-1 sm:grid-cols-3 gap-2" @keydown="onKeydown">
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      ref="items"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :tabindex="modelValue === opt.value || (!hasSelection && i === 0) ? 0 : -1"
      :disabled="disabled"
      class="text-left p-3 rounded-xl border-2 transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2"
      :class="modelValue === opt.value ? 'border-[var(--color-accent-primary)] bg-accent-primary-subtle' : 'border-base bg-[var(--bg-card)] hover:border-[var(--border-hover)]'"
      @click="$emit('update:modelValue', opt.value)"
    >
      <span class="block text-small font-semibold text-base-primary">{{ opt.label }}</span>
      <span v-if="opt.description" class="block text-micro text-base-muted mt-0.5">{{ opt.description }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  options: { value: string; label: string; description?: string }[]
  name?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const items = ref<HTMLButtonElement[]>([])
const hasSelection = computed(() => props.options.some(o => o.value === props.modelValue))

function onKeydown(e: KeyboardEvent) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  if (!keys.includes(e.key)) return
  e.preventDefault()
  const current = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
  const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
  const next = (current + delta + props.options.length) % props.options.length
  emit('update:modelValue', props.options[next]!.value)
  nextTick(() => items.value[next]?.focus())
}
</script>
