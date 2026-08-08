<template>
  <section v-if="items.length" class="feed">
    <p class="feed__label">Acontecendo hoje</p>
    <div class="feed__list">
      <HomeFeedItem v-for="item in items" :key="item.label" :item="item" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FeedItemData } from './HomeFeedItem.vue'

defineProps<{
  items: FeedItemData[]
}>()
</script>

<style scoped>
.feed {
  padding-left: 24px;
  border-left: 1px solid var(--border-base);
}
@media (max-width: 767px) {
  .feed {
    border-left: none;
    border-top: 1px solid var(--border-base);
    padding-left: 0;
    padding-top: 24px;
    margin-top: 24px;
  }
}

.feed__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}
.feed__list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
