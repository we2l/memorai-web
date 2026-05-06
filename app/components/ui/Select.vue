<template>
  <div class="relative" ref="containerRef">
    <button
      type="button"
      class="input-base flex items-center justify-between gap-2 text-left"
      @click="toggle"
    >
      <span class="truncate" :class="modelValue ? 'text-base-primary' : 'text-base-muted'">
        {{ selectedLabel || placeholder }}
      </span>
      <ChevronDown :size="16" class="text-base-muted shrink-0 transition-transform" :class="open && 'rotate-180'" />
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-base bg-surface-secondary shadow-lg py-1"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="w-full text-left px-3 py-2 text-small transition-colors"
          :class="opt.value === modelValue ? 'text-accent-primary bg-accent-primary-subtle' : 'text-base-primary hover:bg-surface-tertiary'"
          @click="select(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() =>
  props.options.find(o => o.value === props.modelValue)?.label ?? '',
)

function toggle() {
  open.value = !open.value
}

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 100ms ease-out;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
