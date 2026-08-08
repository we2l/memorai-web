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
  padding-left: 20px;
  border-left: 1px solid color-mix(in srgb, var(--border-base) 60%, transparent);
}
@media (max-width: 767px) {
  .feed {
    border-left: none;
    padding-left: 0;
    margin-top: 20px;
  }
}
.feed__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.feed__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
