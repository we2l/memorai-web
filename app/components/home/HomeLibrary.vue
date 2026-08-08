<template>
  <section v-if="sortedTopics.length" class="library">
    <p class="library__label">Continuar estudando</p>
    <div class="library__list">
      <HomeLibraryCard v-for="tp in sortedTopics" :key="tp.id" :topic="tp" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TopicProgress } from '~/types'

const props = defineProps<{
  topics: TopicProgress[]
}>()

const sortedTopics = computed(() =>
  [...props.topics]
    .sort((a, b) => ((b as any).pending_count ?? 0) - ((a as any).pending_count ?? 0))
    .slice(0, 4),
)
</script>

<style scoped>
.library__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
}
.library__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
