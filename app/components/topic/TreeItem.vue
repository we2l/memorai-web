<template>
  <div>
    <button
      class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-body transition-colors"
      :class="topic.id === selectedId ? 'bg-white/10 text-baigi-text font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white/80'"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="$emit('select', topic.id)"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <button
        v-if="topic.children?.length"
        class="shrink-0 p-1.5 rounded hover:bg-white/10 text-white/40"
        @click.stop="expanded = !expanded"
      >
        <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': expanded }" />
      </button>
      <span v-else class="w-5" />

      <!-- Health indicator -->
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
        <button class="p-2 rounded text-white/40 hover:text-white hover:bg-white/10" title="Adicionar tópico" @click="$emit('add-child', topic.id)">
          <Plus :size="14" />
        </button>
        <button class="p-2 rounded text-white/40 hover:text-white hover:bg-white/10" title="Editar" @click="$emit('edit', topic)">
          <Pencil :size="14" />
        </button>
        <button class="p-2 rounded text-white/40 hover:text-red-400 hover:bg-white/10" title="Deletar" @click="$emit('delete', topic)">
          <Trash2 :size="14" />
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
        :progress-map="progressMap"
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
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()

const expanded = ref(true)
const isHovered = ref(false)
const showActions = computed(() => isHovered.value || props.topic.id === props.selectedId)

const healthColor = computed(() => {
  const p = props.progressMap?.[props.topic.id]
  if (p === undefined) return 'bg-white/20'
  if (p < 0.3) return 'bg-red-400/70'
  if (p < 0.7) return 'bg-[#F4C84A]/70'
  return 'bg-[#F4C84A]'
})
</script>
