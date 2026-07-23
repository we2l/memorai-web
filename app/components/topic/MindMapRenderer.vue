<template>
  <div class="relative w-full h-full min-h-[300px]">
    <div ref="containerRef" class="absolute inset-0 mindmap-container" />
    <!-- Fit button -->
    <button
      v-if="hasData"
      class="absolute bottom-3 right-3 p-2 rounded-lg bg-[var(--bg-card)] border border-base shadow text-base-muted hover:text-base-primary transition-colors"
      title="Centralizar"
      @click="handleFit"
    >
      <Maximize2 :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Maximize2 } from 'lucide-vue-next'
import { useMindMap, type MindMapNode } from '~/composables/useMindMap'

const props = defineProps<{
  data: MindMapNode | null
  colorByType?: boolean
}>()

const emit = defineEmits<{
  (e: 'node-click', node: MindMapNode): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const hasData = computed(() => !!props.data && props.data.children.length > 0)

const { render, fit, destroy } = useMindMap(containerRef, {
  colorByType: props.colorByType,
  onNodeClick: (node) => emit('node-click', node),
})

watch(() => props.data, async (newData) => {
  await nextTick()
  render(newData)
}, { immediate: false })

onMounted(async () => {
  await nextTick()
  if (props.data) render(props.data)
})

onUnmounted(() => destroy())

function handleFit() {
  fit()
}
</script>

<style>
.mindmap-container svg {
  background: transparent;
}

.mindmap-container .markmap-node text,
.mindmap-container .markmap-node foreignObject span {
  color: var(--text-primary);
  fill: var(--text-primary);
  font-size: 14px;
}

.dark .mindmap-container .markmap-node text,
.dark .mindmap-container .markmap-node foreignObject span {
  color: var(--text-primary);
  fill: var(--text-primary);
}
</style>
