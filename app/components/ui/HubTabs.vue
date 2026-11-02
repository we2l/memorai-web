<template>
  <div class="flex gap-6 border-b border-line-strong" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      class="pb-2.5 text-body font-medium transition-colors border-b-2 -mb-px"
      :class="modelValue === tab.key
        ? 'text-action-fg border-action-fg'
        : 'text-fg-muted border-transparent hover:text-fg'"
      @click="select(tab.key)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="text-meta ml-1 opacity-70">({{ tab.count }})</span>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  key: string
  label: string
  count?: number
}

const props = defineProps<{
  tabs: Tab[]
  modelValue: string
  storageKey?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function select(key: string) {
  emit('update:modelValue', key)
  if (props.storageKey) {
    try { localStorage.setItem(props.storageKey, key) } catch { /* intencional: sem localStorage a aba só não é lembrada */ }
  }
}
</script>
