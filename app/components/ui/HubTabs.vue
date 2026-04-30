<template>
  <div class="flex gap-6 border-b border-base" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      class="pb-2.5 text-body font-medium transition-colors border-b-2 -mb-px"
      :class="modelValue === tab.key
        ? 'text-accent-primary border-accent-primary'
        : 'text-base-muted border-transparent hover:text-base-secondary'"
      @click="select(tab.key)"
    >
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="text-small ml-1 opacity-70">({{ tab.count }})</span>
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
    try { localStorage.setItem(props.storageKey, key) } catch {}
  }
}
</script>
