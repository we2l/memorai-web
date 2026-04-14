<template>
  <div>
    <button
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-small transition-colors group"
      :class="topic.id === selectedId ? 'bg-primary-500/15 text-primary-400' : 'text-base-secondary hover:bg-surface-tertiary'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
    >
      <button
        v-if="topic.children?.length"
        class="shrink-0 p-0.5 rounded hover:bg-surface-tertiary"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': expanded }" />
      </button>
      <span v-else class="w-5" />

      <span class="truncate flex-1">{{ topic.name }}</span>

      <span class="text-micro text-base-muted shrink-0">
        {{ topic.notes_count ?? 0 }}n · {{ topic.flashcards_count ?? 0 }}c
      </span>

      <!-- Actions (visible on hover) -->
      <span class="hidden group-hover:flex items-center gap-1 shrink-0" @click.stop>
        <button class="p-1 rounded hover:bg-surface-tertiary" title="Adicionar sub-tópico" @click="$emit('add-child', topic.id)">
          <Plus :size="12" />
        </button>
        <button class="p-1 rounded hover:bg-surface-tertiary" title="Editar" @click="$emit('edit', topic)">
          <Pencil :size="12" />
        </button>
        <button class="p-1 rounded hover:bg-surface-tertiary text-danger" title="Deletar" @click="$emit('delete', topic)">
          <Trash2 :size="12" />
        </button>
      </span>
    </button>

    <!-- Children -->
    <div v-if="expanded && topic.children?.length">
      <TopicTreeItem
        v-for="child in topic.children"
        :key="child.id"
        :topic="child"
        :depth="depth + 1"
        :selected-id="selectedId"
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

defineProps<{
  topic: Topic
  depth: number
  selectedId?: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()

const expanded = ref(true)
</script>
