<template>
  <div
    v-if="visible"
    class="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-control bg-subtle border border-line-strong shadow-lg"
    :style="{ top: `${position.y}px`, left: `${position.x}px` }"
  >
    <button
      class="flex items-center gap-1 px-2 py-1 rounded text-label font-medium text-action-fg hover:bg-action-subtle transition-colors"
      @mousedown.prevent="$emit('createCard')"
    >
      <Zap :size="12" /> Criar card
    </button>
    <button
      class="flex items-center gap-1 px-2 py-1 rounded text-label font-medium text-fg-muted hover:bg-line transition-colors"
      @mousedown.prevent="$emit('askAi')"
    >
      <Sparkles :size="12" class="inline" /> Perguntar
    </button>
  </div>
</template>

<script setup lang="ts">
import { Zap, Sparkles } from 'lucide-vue-next'

defineEmits<{ createCard: []; askAi: [] }>()

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const lastSelection = ref('')

function onSelectionChange() {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.toString().trim()) {
    visible.value = false
    return
  }

  lastSelection.value = sel.toString().trim()
  const range = sel.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  position.value = {
    x: rect.left + rect.width / 2 - 80,
    y: rect.top - 44 + window.scrollY,
  }
  visible.value = true
}

defineExpose({ lastSelection })

onMounted(() => document.addEventListener('selectionchange', onSelectionChange))
onUnmounted(() => document.removeEventListener('selectionchange', onSelectionChange))
</script>
