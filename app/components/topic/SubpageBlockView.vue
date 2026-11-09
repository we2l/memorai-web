<template>
  <NodeViewWrapper v-if="topicExists" class="subpage-node-wrapper" :class="{ selected }">
    <button
      type="button"
      class="subpage-card w-full cursor-pointer text-left hover:border-action-fg/40 hover:bg-action-subtle"
      @click="handleClick"
    >
      <FolderOpen :size="16" class="shrink-0 text-action-fg" aria-hidden="true" />
      <span class="flex-1 truncate text-body font-medium text-fg-strong">
        {{ displayName }}
      </span>
      <ChevronRight :size="14" class="shrink-0 text-fg-muted" aria-hidden="true" />
    </button>
  </NodeViewWrapper>
  <NodeViewWrapper v-else class="subpage-node-wrapper-empty" />
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { FolderOpen, ChevronRight } from 'lucide-vue-next'

const props = defineProps(nodeViewProps)

const topicStore = useTopicStore()

const topicId = computed(() => props.node.attrs.topicId as string | null)

const topic = computed(() => {
  if (!topicId.value) return null
  return topicStore.findById(topicId.value)
})

const topicExists = computed(() => !!topic.value)

// Auto-remove block if topic was deleted
function tryRemoveBlock() {
  if (!topicExists.value && topicId.value && topicStore.tree.length > 0) {
    const pos = props.getPos()
    if (typeof pos === 'number') {
      // Use setTimeout to avoid modifying doc during render
      setTimeout(() => {
        props.editor.commands.deleteRange({ from: pos, to: pos + props.node.nodeSize })
      }, 0)
    }
  }
}

watch(topicExists, (exists) => {
  if (!exists) tryRemoveBlock()
})

onMounted(() => {
  // Check on mount in case topic was already deleted before this block rendered
  nextTick(() => tryRemoveBlock())
})

const displayName = computed(() => {
  return topic.value?.name ?? ''
})

const selected = computed(() => props.selected)

function handleClick() {
  if (!topicExists.value || !topicId.value) return
  navigateToTopic()
}

function handleDblClick() {
  // noop — single click already navigates
}

function navigateToTopic() {
  if (!topicId.value) return
  const onNavigate = props.extension.options.onNavigate
  if (onNavigate) {
    onNavigate(topicId.value)
  }
}
</script>

<style scoped>
.subpage-node-wrapper-empty {
  display: none;
}

.subpage-node-wrapper {
  margin: 0.5rem 0;
}

.subpage-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-row);
  border: 1px solid var(--line-strong);
  background: var(--surface-raised);
  transition: border-color var(--dur-fast) ease, background-color var(--dur-fast) ease;
}

.subpage-node-wrapper.selected .subpage-card {
  border-color: var(--action-fg);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus-ring) 15%, transparent);
}
</style>
