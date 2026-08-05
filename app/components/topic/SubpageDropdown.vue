<template>
  <div
    ref="dropdownRef"
    class="subpage-dropdown"
    :style="positionStyle"
    @keydown="handleKeydown"
  >
    <div class="p-2">
      <input
        ref="inputRef"
        v-model="query"
        class="w-full px-3 py-2 text-small rounded-lg bg-surface-secondary border border-base text-base-primary placeholder:text-base-muted focus:outline-none focus:border-[var(--color-accent-primary)]"
        placeholder="Nome da matéria..."
        @keydown.enter.prevent="confirmSelection"
        @keydown.escape.prevent="$emit('close')"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.up.prevent="moveSelection(-1)"
      />
    </div>

    <div class="max-h-48 overflow-y-auto">
      <!-- Existing children -->
      <button
        v-for="(child, index) in filteredChildren"
        :key="child.id"
        class="subpage-dropdown-item"
        :class="{ 'bg-surface-secondary': index === selectedIndex }"
        @mouseenter="selectedIndex = index"
        @mousedown.prevent="selectExisting(child.id)"
      >
        <FolderOpen :size="14" class="text-[var(--color-accent-soft)] shrink-0" />
        <span class="truncate text-base-primary">{{ child.name }}</span>
      </button>

      <!-- Create new option -->
      <button
        v-if="showCreateOption"
        class="subpage-dropdown-item border-t border-base"
        :class="{ 'bg-surface-secondary': selectedIndex === filteredChildren.length }"
        @mouseenter="selectedIndex = filteredChildren.length"
        @mousedown.prevent="createNew"
      >
        <Plus :size="14" class="text-[var(--color-accent-soft)] shrink-0" />
        <span class="text-base-primary">Criar "<strong class="text-[var(--color-accent-soft)]">{{ query }}</strong>"</span>
      </button>

      <!-- Empty state -->
      <div v-if="!filteredChildren.length && !showCreateOption" class="px-3 py-4 text-center text-small text-base-muted">
        Digite o nome da matéria
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen, Plus } from 'lucide-vue-next'
import type { Topic } from '~/types'

const props = defineProps<{
  topicId: string
  position: { top: number; left: number }
}>()

const emit = defineEmits<{
  (e: 'select', topicId: string): void
  (e: 'create', name: string): void
  (e: 'close'): void
}>()

const dropdownRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const query = ref('')
const selectedIndex = ref(0)

const topicStore = useTopicStore()

const children = computed(() => {
  const parent = topicStore.findById(props.topicId)
  return parent?.children || []
})

const filteredChildren = computed(() => {
  if (!query.value.trim()) return children.value
  const q = query.value.toLowerCase()
  return children.value.filter((c: Topic) => c.name.toLowerCase().includes(q))
})

const showCreateOption = computed(() => {
  if (!query.value.trim()) return false
  // Don't show if exact match exists
  const q = query.value.toLowerCase()
  return !children.value.some((c: Topic) => c.name.toLowerCase() === q)
})

const totalItems = computed(() => filteredChildren.value.length + (showCreateOption.value ? 1 : 0))

const positionStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.position.top}px`,
  left: `${props.position.left}px`,
}))

function moveSelection(delta: number) {
  const max = totalItems.value - 1
  selectedIndex.value = Math.max(0, Math.min(selectedIndex.value + delta, max))
}

function confirmSelection() {
  if (selectedIndex.value < filteredChildren.value.length) {
    selectExisting(filteredChildren.value[selectedIndex.value].id)
  } else if (showCreateOption.value) {
    createNew()
  } else if (query.value.trim()) {
    // No matches, no create option shown yet — treat as create
    emit('create', query.value.trim())
  }
}

function selectExisting(topicId: string) {
  emit('select', topicId)
}

function createNew() {
  emit('create', query.value.trim())
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// Focus input on mount + close on click outside (delayed to avoid capturing the opening click)
onMounted(() => {
  nextTick(() => {
    inputRef.value?.focus()
    document.addEventListener('mousedown', onClickOutside)
  })
})

// Close on click outside
function onClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<style scoped>
.subpage-dropdown {
  z-index: 50;
  width: 280px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-base, #e5e7eb);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-dropdown, 0 8px 24px rgba(0, 0, 0, 0.12));
  overflow: hidden;
}

.subpage-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  transition: background 0.1s;
  cursor: pointer;
}

.subpage-dropdown-item:hover {
  background: var(--bg-surface-secondary, #f9fafb);
}
</style>
