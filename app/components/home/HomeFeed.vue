<template>
  <aside v-if="items.length" class="feed">
    <p class="feed__label">Acontecendo hoje</p>
    <div class="feed__list">
      <HomeFeedItem v-for="item in items" :key="item.label" :item="item" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { FeedItemData } from './HomeFeedItem.vue'

defineProps<{
  items: FeedItemData[]
}>()
</script>

<style scoped>
.feed {
  padding-left: 28px;
  border-left: 1px solid var(--border-base);
}
.dark .feed {
  border-left-color: var(--border-base);
}
@media (max-width: 1023px) {
  .feed {
    border-left: none;
    padding-left: 0;
    padding-top: 20px;
    border-top: 1px solid var(--border-base);
  }
  .dark .feed {
    border-top-color: var(--border-base);
  }
}

.feed__label {
  font-size: 11px;
  font-weight: 620;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 16px;
}
.feed__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
