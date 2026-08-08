<template>
  <section v-if="sortedTopics.length" class="library">
    <p class="library__label">Continuar estudando</p>
    <div class="library__grid">
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
.library {
  margin-top: 32px;
}
.library__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}
.library__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 640px) {
  .library__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
