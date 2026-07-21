<template>
  <div>
    <button
      class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-body transition-colors"
      :class="topic.id === selectedId ? 'bg-surface-secondary text-base-primary font-medium' : 'text-base-muted hover:bg-surface-secondary hover:text-base-secondary'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <button
        v-if="topic.children?.length"
        class="shrink-0 p-1.5 rounded hover:bg-surface-secondary text-base-muted"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': expanded }" />
      </button>
      <span v-else class="w-5" />

      <!-- Health/urgency indicator -->
      <span
        v-if="topic.flashcards_count > 0"
        class="w-2 h-2 rounded-full shrink-0"
        :class="healthColor"
      />

      <span class="truncate flex-1" :title="topic.name">{{ topic.name }}</span>

      <span v-if="(topic.flashcards_count || topic.notes_count) && !showActions" class="text-small text-base-muted shrink-0">
        {{ topic.flashcards_count ?? 0 }}
      </span>

      <!-- Actions (visible on hover/selected) -->
      <span v-if="showActions" class="flex items-center gap-0.5 shrink-0" @click.stop>
        <button class="p-2 rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary" title="Adicionar tópico" @click="$emit('add-child', topic.id)">
          <Plus :size="14" />
        </button>
        <button class="p-2 rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary" title="Editar" @click="$emit('edit', topic)">
          <Pencil :size="14" />
        </button>
        <button class="p-2 rounded text-base-muted hover:text-red-400 hover:bg-surface-secondary" title="Deletar" @click="$emit('delete', topic)">
          <Trash2 :size="14" />
        </button>
      </span>
    </button>

    <!-- Children -->
    <div v-if="isExpanded && topic.children?.length">
      <TopicTreeItem
        v-for="child in topic.children"
        :key="child.id"
        :topic="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :progress-map="progressMap"
        :force-expand="forceExpand"
        @select="$emit('select', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @add-child="$emit('add-child', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import type { Topic } from '~/types'

const props = defineProps<{
  topic: Topic
  depth: number
  selectedId?: string | null
  progressMap?: Record<string, number>
  forceExpand?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()

// Collapse by default for depth > 0, expand for root
const expanded = ref(props.depth === 0)
const isHovered = ref(false)
const showActions = computed(() => isHovered.value || props.topic.id === props.selectedId)

// Force expand when searching, or when selected item is in this subtree
const isExpanded = computed(() => {
  if (props.forceExpand) return true
  return expanded.value
})

// Auto-expand when this topic or a child is selected
function isInSubtree(topics: Topic[], targetId: string): boolean {
  for (const t of topics) {
    if (t.id === targetId) return true
    if (t.children?.length && isInSubtree(t.children, targetId)) return true
  }
  return false
}

watch(() => props.selectedId, (newId) => {
  if (!newId) return
  if (props.topic.id === newId || (props.topic.children?.length && isInSubtree(props.topic.children, newId))) {
    expanded.value = true
  }
}, { immediate: true })

const healthColor = computed(() => {
  const p = props.progressMap?.[props.topic.id]
  if (p === undefined) return 'bg-[var(--border-base)]'
  if (p < 0.3) return 'bg-red-400'
  if (p < 0.7) return 'bg-amber-400'
  return 'bg-emerald-400'
})
</script>
