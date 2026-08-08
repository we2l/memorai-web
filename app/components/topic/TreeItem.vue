<template>
  <div>
    <!-- Main row -->
    <button
      class="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-body transition-colors"
      :class="topic.id === selectedId ? 'border-l-3 border-l-[var(--color-accent-soft)] font-medium text-base-primary bg-accent-primary-subtle/20' : 'text-base-secondary hover:bg-surface-secondary hover:text-base-primary'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
    >
      <!-- Expand chevron -->
      <button
        v-if="topic.children?.length"
        class="shrink-0 p-0.5 rounded hover:bg-surface-secondary text-base-muted"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': expanded }" />
      </button>

      <!-- Color dot (root) or document icon (child) -->
      <span
        v-if="isRoot && topic.color"
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ backgroundColor: colorHex }"
      />
      <span v-else-if="isRoot" class="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--border-base)]" />
      <FileText v-else :size="14" class="shrink-0 text-base-muted/60" />

      <!-- Name -->
      <span class="truncate flex-1" :title="topic.name">{{ topic.name }}</span>

      <!-- Right side: pending badge or 3 dots -->
      <span class="shrink-0 flex items-center gap-1">
        <!-- Pending count badge -->
        <span v-if="pendingCount > 0" class="text-micro font-medium text-[var(--color-accent-soft)] bg-accent-primary-subtle/40 rounded px-1.5 py-0.5">
          {{ pendingCount }}
        </span>
        <span v-else-if="!isRoot && topicProgress > 0 && pendingCount === 0" class="text-micro text-emerald-500">
          ✓
        </span>

        <!-- 3 dots hover menu -->
        <div class="relative opacity-0 group-hover:opacity-100 transition-opacity" :class="{ '!opacity-100': showMenu }" @click.stop>
          <button
            class="p-1 rounded text-base-muted hover:text-base-primary hover:bg-surface-secondary"
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

    <!-- Progress meta block for root cadernos (ALWAYS shown when root, even collapsed) -->
    <div
      v-if="isRoot && (topicCards > 0 || pendingCount > 0)"
      class="px-3 pt-0.5 pb-2.5"
      :style="{ paddingLeft: `${depth * 16 + 36}px` }"
    >
      <!-- Progress percentage + bar -->
      <div class="flex items-center gap-2">
        <div class="flex-1 max-w-[5rem] h-1.5 rounded-full bg-surface-secondary overflow-hidden">
          <div
            class="h-1.5 rounded-full transition-all duration-500"
            :class="progressBarColor"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
        <span class="text-micro font-semibold" :class="progressTextColor">{{ progressPercent }}%</span>
      </div>
      <!-- Pending info -->
      <p v-if="pendingCount > 0" class="text-micro text-[var(--color-accent-soft)] font-medium mt-0.5">
        {{ pendingCount }} pendentes hoje
      </p>
      <p v-else-if="topicCards > 0 && pendingCount === 0" class="text-micro text-emerald-500 mt-0.5">
        Em dia ✓
      </p>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && topic.children?.length" class="relative">
      <div class="absolute top-0 bottom-2 border-l border-[var(--border-base)]/40" :style="{ left: `${(depth + 1) * 16 + 18}px` }" />
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
import { ChevronRight, MoreHorizontal, FileText } from 'lucide-vue-next'
import type { Topic } from '~/types'
import { getColorHex } from '~/utils/colors'

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
const topicCards = computed(() => props.topic.flashcards_count ?? 0)
const progressPercent = computed(() => Math.round(topicProgress.value * 100))

const progressBarColor = computed(() => {
  const p = topicProgress.value
  if (p < 0.3) return 'bg-red-400'
  if (p < 0.7) return 'bg-[var(--color-accent-primary)]'
  return 'bg-emerald-400'
})

const progressTextColor = computed(() => {
  const p = topicProgress.value
  if (p === 0) return 'text-base-muted'
  if (p < 0.3) return 'text-red-400'
  if (p < 0.7) return 'text-[var(--color-accent-soft)]'
  return 'text-emerald-500'
})

// Collapse by default for depth > 0, expand for root
const expanded = ref(props.depth === 0)
const showMenu = ref(false)

// Force expand when searching
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
</script>
