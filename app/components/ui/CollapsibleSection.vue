<template>
  <div class="border-b border-base">
    <div
      class="flex items-center justify-between w-full px-4 py-3 text-left group cursor-pointer"
      role="button"
      tabindex="0"
      :aria-expanded="isOpen"
      :aria-controls="`section-${id}`"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
    >
      <div class="flex items-center gap-2">
        <ChevronRight
          :size="16"
          class="text-base-muted transition-transform duration-150"
          :class="isOpen && 'rotate-90'"
        />
        <span class="text-label">{{ title }}</span>
        <span v-if="count !== undefined" class="text-micro text-base-muted">({{ count }})</span>
        <span
          v-if="healthDot"
          class="w-2 h-2 rounded-full bg-accent-primary animate-pulse"
        />
      </div>
      <div class="flex items-center gap-2" @click.stop>
        <slot name="actions" />
      </div>
    </div>
    <div
      :id="`section-${id}`"
      class="grid transition-[grid-template-rows] duration-150"
      :class="isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div class="overflow-hidden">
        <div class="px-4 pb-4">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  id: string
  title: string
  count?: number
  defaultOpen?: boolean
  healthDot?: boolean
}>()

const STORAGE_KEY = 'memorai-sections'

function loadState(): boolean {
  if (!import.meta.client) return props.defaultOpen ?? false
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return stored[props.id] ?? props.defaultOpen ?? false
  } catch {
    return props.defaultOpen ?? false
  }
}

function saveState(open: boolean) {
  if (!import.meta.client) return
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    stored[props.id] = open
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {}
}

const isOpen = ref(loadState())

function toggle() {
  isOpen.value = !isOpen.value
  saveState(isOpen.value)
}
</script>
