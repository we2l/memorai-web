<template>
  <section v-if="sortedTopics.length" class="library">
    <div class="library__header">
      <p class="library__label">Continuar estudando</p>
      <NuxtLink v-if="hasMore" to="/cadernos" class="library__link">Ver todos →</NuxtLink>
    </div>
    <div class="library__grid">
      <HomeLibraryCard v-for="tp in displayedTopics" :key="tp.id" :topic="tp" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TopicProgress } from '~/types'

const MAX_DISPLAY = 4

const props = defineProps<{
  topics: TopicProgress[]
}>()

const sortedTopics = computed(() =>
  [...props.topics]
    .sort((a, b) => {
      // Priority 1: cards pending (overdue/due)
      const aPending = (a as any).pending_count ?? 0
      const bPending = (b as any).pending_count ?? 0
      if (aPending !== bPending) return bPending - aPending

      // Priority 2: recent activity (updated_at)
      const aTime = (a as any).updated_at ? new Date((a as any).updated_at).getTime() : 0
      const bTime = (b as any).updated_at ? new Date((b as any).updated_at).getTime() : 0
      if (aTime !== bTime) return bTime - aTime

      // Priority 3: more cards = more relevant
      return (b.flashcards_count ?? 0) - (a.flashcards_count ?? 0)
    }),
)

const displayedTopics = computed(() => sortedTopics.value.slice(0, MAX_DISPLAY))
const hasMore = computed(() => props.topics.length > MAX_DISPLAY)
</script>

<style scoped>
.library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.library__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.library__link {
  font-size: 12px;
  font-weight: 560;
  color: var(--color-primary-500);
  transition: opacity 150ms;
}
.dark .library__link {
  color: var(--color-accent-primary);
}
.library__link:hover {
  opacity: 0.7;
}
.library__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 640px) {
  .library__grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
</style>
