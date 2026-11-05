<template>
  <div class="relative h-full min-h-75 w-full">
    <div ref="containerRef" class="absolute inset-0 mindmap-container" />
    <!-- Fit button -->
    <div v-if="hasData" class="absolute bottom-3 right-3 rounded-control bg-raised shadow-card">
      <UiIconButton :icon="Maximize2" label="Centralizar" @click="handleFit" />
    </div>
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

// The branches take their color from the tokens when drawn: another theme, another drawing
const { colorMode } = useColorMode()
watch(colorMode, () => { render(props.data) })

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
/* markmap writes its own DOM: no way to put a class on it */
.mindmap-container svg {
  background: transparent;
}

.mindmap-container .markmap-node text,
.mindmap-container .markmap-node foreignObject span {
  color: var(--fg-strong);
  fill: var(--fg-strong);
  font-size: var(--text-meta);
}
</style>
