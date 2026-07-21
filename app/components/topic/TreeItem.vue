<template>
  <div>
    <button
      class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-body transition-colors"
      :class="topic.id === selectedId ? 'bg-accent-primary-subtle text-[var(--color-accent-soft)] font-medium border-l-3 border-l-[var(--color-accent-soft)]' : 'text-base-muted hover:bg-surface-secondary hover:text-base-secondary'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false; showMenu = false"
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

      <span class="shrink-0 flex items-center">
        <span v-if="(topic.flashcards_count || topic.notes_count) && !showActions" class="text-small text-base-muted">
          {{ topic.flashcards_count ?? 0 }}
        </span>
        <div v-if="showActions" class="relative" @click.stop>
          <button
            class="p-1.5 rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary"
            title="Opções"
            @click="showMenu = !showMenu"
          >
            <MoreHorizontal :size="14" />
          </button>
          <div v-if="showMenu" class="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-card)] border border-base rounded-lg shadow-lg py-1 z-30">
            <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; $emit('add-child', topic.id)">
              Adicionar tópico
            </button>
            <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; $emit('edit', topic)">
              Editar
            </button>
            <button class="w-full text-left px-3 py-2 text-small text-danger hover:bg-danger/5 transition-colors" @click="showMenu = false; $emit('delete', topic)">
              Deletar
            </button>
          </div>
        </div>
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
import { ChevronRight, MoreHorizontal } from 'lucide-vue-next'
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
const showMenu = ref(false)
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
