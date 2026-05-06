<template>
  <div class="border-b border-base last:border-b-0">
    <div
      class="flex flex-wrap items-center justify-between gap-2 w-full px-4 py-4 text-left group cursor-pointer"
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
        <component :is="icon" v-if="icon" :size="16" class="text-base-muted shrink-0" />
        <span class="text-body font-semibold text-base-primary">{{ title }}</span>
        <span v-if="count !== undefined" class="text-body text-base-muted">({{ count }})</span>
        <span v-if="tooltip" class="relative group/tip">
          <Info :size="14" class="text-base-muted cursor-help" />
          <span class="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-60 px-3 py-2.5 rounded-xl bg-surface-secondary border border-base text-small text-base-secondary leading-relaxed opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150" style="box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
            {{ tooltip }}
          </span>
        </span>
        <span
          v-if="healthDot"
          class="w-2 h-2 rounded-full bg-accent-primary animate-pulse"
        />
      </div>
      <div v-if="isOpen" class="flex items-center gap-2" @click.stop>
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
import { ChevronRight, Info } from 'lucide-vue-next'

const props = defineProps<{
  id: string
  title: string
  icon?: any
  count?: number | string
  defaultOpen?: boolean
  healthDot?: boolean
  tooltip?: string
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
