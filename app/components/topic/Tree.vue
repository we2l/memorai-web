<template>
  <div class="space-y-1">
    <TopicTreeItem
      v-for="topic in topics"
      :key="topic.id"
      :topic="topic"
      :depth="0"
      :selected-id="selectedId"
      @select="$emit('select', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @add-child="$emit('add-child', $event)"
    />
    <div v-if="!topics.length" class="text-small text-base-muted px-3 py-4">
      Nenhum tópico criado.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Topic } from '~/types'

defineProps<{
  topics: Topic[]
  selectedId?: string | null
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string): void
}>()
</script>
