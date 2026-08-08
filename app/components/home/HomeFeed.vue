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
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed color-mix(in srgb, var(--border-base) 50%, transparent);
}
.feed__label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.feed__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
