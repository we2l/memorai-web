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
  border-left: 1px solid color-mix(in srgb, var(--border-base) 50%, transparent);
}
@media (max-width: 1023px) {
  .feed {
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--border-base) 50%, transparent);
    padding-left: 0;
    padding-top: 20px;
    margin-top: 20px;
  }
}

.feed__label {
  font-size: 11px;
  font-weight: 500;
  color: color-mix(in srgb, var(--color-text-muted) 80%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 14px;
}
.feed__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
