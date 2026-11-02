<template>
  <!-- Practice of the caderno: each mode says what it still needs before the click (F1 RF-F5) -->
  <div class="mx-4 mb-2 mt-3 grid gap-2" :class="requirementText(quizGate) || requirementText(podcastGate) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'">
    <UiListRow as="button" class="bg-raised shadow-card" title="Podcast" :meta="requirementText(podcastGate) ?? undefined" @click="$emit('podcast')">
      <template #leading><Headphones class="size-4 text-listen" aria-hidden="true" /></template>
      <template #trailing><ChevronRight class="size-4" aria-hidden="true" /></template>
    </UiListRow>
    <UiListRow as="button" class="bg-raised shadow-card" title="Simulado" :meta="requirementText(quizGate) ?? undefined" @click="$emit('quiz')">
      <template #leading><ClipboardList class="size-4 text-quiz" aria-hidden="true" /></template>
      <template #trailing><ChevronRight class="size-4" aria-hidden="true" /></template>
    </UiListRow>
  </div>
</template>

<script setup lang="ts">
import { Headphones, ClipboardList, ChevronRight } from 'lucide-vue-next'
import { requirementText, type StudyGate } from '~/utils/studyRequirement'

defineProps<{
  quizGate?: StudyGate | null
  podcastGate?: StudyGate | null
}>()

defineEmits<{
  (e: 'podcast'): void
  (e: 'quiz'): void
}>()
</script>
