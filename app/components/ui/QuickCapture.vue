<template>
  <div>
    <!-- Trigger button -->
    <button
      class="fixed z-40 bg-[var(--bg-soft)] border border-base rounded-full p-3 shadow-lg hover:bg-surface-secondary transition-all lg:right-6 hidden lg:block text-base-secondary hover:text-base-primary"
      :class="isOpen ? '!hidden' : ''"
      style="bottom: calc(var(--fab-bottom) + 56px);"
      title="Anotar rapidamente (Ctrl+N)"
      aria-label="Anotar rapidamente (Ctrl+N)"
      @click="open"
    >
      <PenLine :size="20" class="text-accent-primary" aria-hidden="true" />
    </button>

    <!-- Modal chunk only loads on first open -->
    <LazyUiQuickCaptureModal v-if="loaded" v-model="isOpen" />
  </div>
</template>

<script setup lang="ts">
import { PenLine } from 'lucide-vue-next'

const isOpen = ref(false)
const loaded = ref(false)

function open() {
  loaded.value = true
  isOpen.value = true
}

// Global shortcut Ctrl+N
if (import.meta.client) {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
      e.preventDefault()
      isOpen.value ? (isOpen.value = false) : open()
    }
  }
  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
</script>
