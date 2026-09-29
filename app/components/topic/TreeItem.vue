<template>
  <div class="sidebar-item">
    <!-- === ROOT CADERNO === -->
    <template v-if="isRoot">
      <div
        class="root-caderno group"
        :class="{ 'root-caderno--active': isSelected }"
        role="button"
        tabindex="0"
        :aria-current="isSelected ? 'true' : undefined"
        @click="$emit('select', topic.id)"
        @keydown.enter.self.prevent="$emit('select', topic.id)"
        @keydown.space.self.prevent="$emit('select', topic.id)"
      >
        <!-- Header: dot + name + menu -->
        <div class="flex items-center gap-2.5">
          <!-- Color dot (large, identity) -->
          <span
            class="w-3 h-3 rounded-full shrink-0 shadow-sm"
            :style="{ backgroundColor: colorHex }"
          />

          <!-- Name -->
          <span class="flex-1 truncate font-semibold text-[13px] leading-tight" :title="topic.name">
            {{ topic.name }}
          </span>

          <!-- Chevron (expand/collapse) -->
          <button
            v-if="topic.children?.length"
            type="button"
            class="relative shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-base-muted hover:text-base-primary transition-colors touch-target"
            :aria-label="`${isExpanded ? 'Recolher' : 'Expandir'} ${topic.name}`"
            :aria-expanded="isExpanded"
            @click.stop="expanded = !expanded"
            @keydown.stop
          >
            <ChevronRight :size="12" class="transition-transform duration-150" :class="{ 'rotate-90': isExpanded }" aria-hidden="true" />
          </button>

          <TopicTreeItemMenu :name="topic.name" @action="onMenuAction" />
        </div>

        <!-- Progress block (identity of Baigi) -->
        <div v-if="topicCards > 0 || pendingCount > 0" class="mt-2 ml-[22px]">
          <!-- Progress bar (full width, prominent) -->
          <div class="w-full h-[5px] rounded-full bg-[var(--border-base)]/40 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="progressBarColor"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <!-- Stats -->
          <p class="text-[11px] mt-1.5 leading-none">
            <span class="text-base-muted">{{ topicCards }} cards</span>
            <span v-if="pendingCount > 0" class="text-[var(--badge-primary-text)] font-semibold"> · {{ pendingCount }} pendentes</span>
            <span v-else-if="topicProgress > 0" class="text-[var(--badge-success-text)] font-medium"> · em dia ✓</span>
          </p>
        </div>
      </div>

      <!-- Children (materiais de estudo) -->
      <div v-if="isExpanded && topic.children?.length" class="mt-1 ml-[10px] pl-[12px] border-l border-[var(--border-base)]/30">
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
    </template>

    <!-- === CHILD (tópico / sub-tópico) === -->
    <template v-else>
      <div
        class="child-item group"
        :class="{ 'child-item--active': isSelected }"
        role="button"
        tabindex="0"
        :aria-current="isSelected ? 'true' : undefined"
        @click="$emit('select', topic.id)"
        @keydown.enter.self.prevent="$emit('select', topic.id)"
        @keydown.space.self.prevent="$emit('select', topic.id)"
      >
        <!-- Expand chevron for nested children -->
        <button
          v-if="topic.children?.length"
          type="button"
          class="relative shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-base-muted hover:text-base-primary transition-colors touch-target"
          :aria-label="`${isExpanded ? 'Recolher' : 'Expandir'} ${topic.name}`"
          :aria-expanded="isExpanded"
          @click.stop="expanded = !expanded"
          @keydown.stop
        >
          <ChevronRight :size="11" class="transition-transform duration-150" :class="{ 'rotate-90': isExpanded }" aria-hidden="true" />
        </button>

        <!-- Document icon -->
        <FileText :size="13" class="shrink-0 text-base-muted/50" aria-hidden="true" />

        <!-- Name -->
        <span class="flex-1 truncate text-[12.5px]" :title="topic.name">
          {{ topic.name }}
        </span>

        <!-- Pending badge -->
        <span v-if="pendingCount > 0" class="text-[10px] font-semibold text-[var(--badge-primary-text)] bg-[var(--color-accent-primary)]/8 rounded px-1.5 py-0.5 shrink-0">
          {{ pendingCount }}
        </span>
        <span v-else-if="topicCards > 0 && topicProgress > 0 && pendingCount === 0" class="text-[10px] text-[var(--badge-success-text)] shrink-0">✓</span>

        <TopicTreeItemMenu :name="topic.name" @action="onMenuAction" />
      </div>

      <!-- Nested children -->
      <div v-if="isExpanded && topic.children?.length" class="ml-4 pl-3 border-l border-[var(--border-base)]/20">
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, FileText } from 'lucide-vue-next'
import type { Topic } from '~/types'
import { getColorHex } from '~/utils/colors'

const props = defineProps<{
  topic: Topic
  depth: number
  selectedId?: string | null
  progressMap?: Record<string, { progress: number; pending_count: number; last_reviewed_at: string | null; color: string | null }>
  forceExpand?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()

function onMenuAction(key: 'add-child' | 'edit' | 'delete') {
  if (key === 'add-child') emit('add-child', props.topic.id)
  else if (key === 'edit') emit('edit', props.topic)
  else emit('delete', props.topic)
}

const isRoot = computed(() => !props.topic.parent_id)
const isSelected = computed(() => props.topic.id === props.selectedId)
const colorHex = computed(() => getColorHex(props.topic.color))

const topicProgress = computed(() => props.progressMap?.[props.topic.id]?.progress ?? 0)
const pendingCount = computed(() => props.progressMap?.[props.topic.id]?.pending_count ?? 0)
const topicCards = computed(() => props.topic.flashcards_count ?? 0)
const progressPercent = computed(() => Math.round(topicProgress.value * 100))

const progressBarColor = computed(() => {
  const p = topicProgress.value
  if (p === 0 && pendingCount.value > 0) return 'bg-[var(--color-accent-primary)]'
  if (p < 0.3) return 'bg-red-400'
  if (p < 0.7) return 'bg-[var(--color-accent-primary)]'
  return 'bg-emerald-400'
})

const expanded = ref(props.depth === 0)

const isExpanded = computed(() => {
  if (props.forceExpand) return true
  return expanded.value
})

// Auto-expand when selected item is in this subtree
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

<style scoped>
/* Root caderno */
.touch-target::after {
  content: '';
  position: absolute;
  inset: -10px;
}
.root-caderno {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 150ms ease-out;
  border: 1px solid transparent;
}

.root-caderno:hover {
  background: color-mix(in srgb, var(--color-accent-soft) 4%, transparent);
}

.root-caderno--active {
  background: color-mix(in srgb, var(--color-accent-soft) 6%, transparent);
  border-color: color-mix(in srgb, var(--color-accent-primary) 15%, transparent);
  border-left: 3px solid var(--color-accent-primary);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--color-accent-primary) 5%, transparent);
}

/* Child item — tópico / sub-tópico */
.child-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 150ms ease-out;
}

.child-item:hover {
  background: var(--bg-surface-secondary, rgba(0,0,0,0.03));
  color: var(--color-text-secondary);
}

.child-item--active {
  background: color-mix(in srgb, var(--color-accent-soft) 5%, transparent);
  color: var(--color-text-primary);
  font-weight: 500;
}

/* Sidebar item group spacing */
.sidebar-item + .sidebar-item {
  margin-top: 2px;
}
</style>
