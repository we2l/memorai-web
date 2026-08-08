<template>
  <div>
    <button
      class="group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-body transition-colors"
      :class="topic.id === selectedId ? 'border-l-3 border-l-[var(--color-accent-soft)] font-medium text-base-primary bg-accent-primary-subtle/30' : 'text-base-muted hover:bg-surface-secondary hover:text-base-secondary'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
    >
      <button
        v-if="topic.children?.length"
        class="shrink-0 p-1 rounded hover:bg-surface-secondary text-base-muted"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': expanded }" />
      </button>
      <span v-else class="w-5" />

      <!-- Color dot for root topics, health dot for children -->
      <span
        v-if="isRoot && topic.color"
        class="w-2 h-2 rounded-full shrink-0"
        :style="{ backgroundColor: colorHex }"
      />
      <span
        v-else-if="topic.flashcards_count > 0"
        class="w-2 h-2 rounded-full shrink-0"
        :class="healthColor"
      />

      <span class="truncate flex-1" :title="topic.name">{{ topic.name }}</span>

      <span class="shrink-0 flex items-center gap-1.5">
        <!-- Pending badge for children -->
        <span v-if="!isRoot && pendingCount > 0" class="text-micro text-base-muted bg-surface-secondary rounded px-1 py-0.5">
          {{ pendingCount }}
        </span>
        <span v-else-if="!isRoot && pendingCount === 0 && topicProgress > 0" class="text-micro text-emerald-500">
          ✓
        </span>

        <!-- 3 dots menu (hover-only on desktop) -->
        <div class="relative opacity-0 group-hover:opacity-100 transition-opacity" :class="{ '!opacity-100': showMenu || topic.id === selectedId }" @click.stop>
          <button
            class="p-1.5 rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary"
            title="Opções"
            @click="showMenu = !showMenu"
          >
            <MoreHorizontal :size="14" />
          </button>
          <div v-if="showMenu" class="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-card)] border border-base rounded-lg shadow-lg py-1 z-30">
            <button class="w-full text-left px-3 py-2 text-small text-base-primary hover:bg-surface-secondary transition-colors" @click="showMenu = false; $emit('add-child', topic.id)">
              Adicionar matéria
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

    <!-- Progress meta for expanded root topics -->
    <div
      v-if="isRoot && isExpanded && topicProgress > 0"
      class="flex items-center gap-2 px-3 pb-1"
      :style="{ paddingLeft: `${depth * 16 + 40}px` }"
    >
      <div class="w-12 h-1 rounded-full bg-surface-secondary overflow-hidden">
        <div
          class="h-1 rounded-full bg-[var(--color-accent-primary)] transition-all"
          :style="{ width: Math.round(topicProgress * 100) + '%' }"
        />
      </div>
      <span class="text-micro text-base-muted">{{ Math.round(topicProgress * 100) }}%</span>
      <span v-if="lastReviewedText" class="text-micro text-base-muted">· {{ lastReviewedText }}</span>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && topic.children?.length" class="relative">
      <div class="absolute top-0 bottom-2 border-l border-[var(--border-base)]" :style="{ left: `${(depth + 1) * 16 + 18}px` }" />
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
import { getColorHex } from '~/utils/colors'
import { relativeDate } from '~/utils/time'

const props = defineProps<{
  topic: Topic
  depth: number
  selectedId?: string | null
  progressMap?: Record<string, { progress: number; pending_count: number; last_reviewed_at: string | null; color: string | null }>
  forceExpand?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()

const isRoot = computed(() => !props.topic.parent_id)
const colorHex = computed(() => getColorHex(props.topic.color))

const topicProgress = computed(() => props.progressMap?.[props.topic.id]?.progress ?? 0)
const pendingCount = computed(() => props.progressMap?.[props.topic.id]?.pending_count ?? 0)
const lastReviewedText = computed(() => relativeDate(props.progressMap?.[props.topic.id]?.last_reviewed_at))

// Collapse by default for depth > 0, expand for root
const expanded = ref(props.depth === 0)
const showMenu = ref(false)

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
  const p = topicProgress.value
  if (p === 0) return 'bg-[var(--border-base)]'
  if (p < 0.3) return 'bg-red-400'
  if (p < 0.7) return 'bg-amber-400'
  return 'bg-emerald-400'
})
</script>
