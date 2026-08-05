<template>
  <NodeViewWrapper v-if="topicExists" class="subpage-node-wrapper" :class="{ selected }">
    <div
      class="subpage-card cursor-pointer hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-primary-50)]"
      @click="handleClick"
    >
      <FolderOpen :size="16" class="shrink-0 text-[var(--color-accent-soft)]" />
      <span class="flex-1 truncate text-body font-medium text-base-primary">
        {{ displayName }}
      </span>
      <ChevronRight :size="14" class="shrink-0 text-base-muted" />
    </div>
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
  border-radius: 0.5rem;
  border: 1px solid var(--border-base, #e5e7eb);
  background: var(--bg-card, #fff);
  transition: all 0.15s ease;
}

.subpage-node-wrapper.selected .subpage-card {
  border-color: var(--color-accent-primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}
</style>
