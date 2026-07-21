<template>
  <div class="space-y-1">
    <TopicTreeItem
      v-for="topic in topics"
      :key="topic.id"
      :topic="topic"
      :depth="0"
      :selected-id="selectedId"
      :progress-map="progressMap"
      :force-expand="forceExpand"
      @select="$emit('select', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
      @add-child="$emit('add-child', $event)"
    />
    <div v-if="!topics.length" class="px-3 py-6 flex flex-col items-center gap-4">
      <BookOpen :size="48" class="text-base-muted opacity-40" />
      <p class="text-body font-medium text-base-primary">Comece sua jornada</p>
      <div class="w-full space-y-2">
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-small text-base-secondary hover:bg-surface-secondary transition-colors"
          @click="$emit('add-child', null)"
        >
          <Plus :size="16" class="text-base-muted shrink-0" />
          <div>
            <p class="font-medium text-base-primary">Criar caderno</p>
            <p class="text-micro text-base-muted">Comece do zero</p>
          </div>
        </button>
        <NuxtLink
          to="/importar"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-small text-base-secondary hover:bg-surface-secondary transition-colors"
        >
          <Upload :size="16" class="text-base-muted shrink-0" />
          <div>
            <p class="font-medium text-base-primary">Importar do Anki</p>
            <p class="text-micro text-base-muted">Traga seus decks</p>
          </div>
        </NuxtLink>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-small text-base-secondary hover:bg-surface-secondary transition-colors"
          @click="$emit('structure-pdf')"
        >
          <FileText :size="16" class="text-base-muted shrink-0" />
          <div>
            <p class="font-medium text-base-primary">Organizar PDF</p>
            <p class="text-micro text-base-muted">A IA monta pra você</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, Plus, Upload, FileText } from 'lucide-vue-next'
import type { Topic } from '~/types'

defineProps<{
  topics: Topic[]
  selectedId?: string | null
  progressMap?: Record<string, number>
  forceExpand?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
  (e: 'edit', topic: Topic): void
  (e: 'delete', topic: Topic): void
  (e: 'add-child', parentId: string | null): void
  (e: 'structure-pdf'): void
}>()
</script>
