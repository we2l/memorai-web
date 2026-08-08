<template>
  <NuxtLink :to="item.url" class="feed-item group">
    <span class="feed-item__icon">{{ item.icon }}</span>
    <div class="feed-item__content">
      <p class="feed-item__title">{{ item.label }}</p>
      <p v-if="item.description" class="feed-item__desc">{{ item.description }}</p>
    </div>
    <span class="feed-item__action">{{ item.action_label }} →</span>
  </NuxtLink>
</template>

<script setup lang="ts">
export interface FeedItemData {
  icon: string
  label: string
  description?: string
  action_label: string
  url: string
}

defineProps<{
  item: FeedItemData
}>()
</script>

<style scoped>
.feed-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 120ms ease-out;
}
.feed-item:hover {
  background: var(--bg-soft);
}

.feed-item__icon {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.8;
}

.feed-item__content {
  flex: 1;
  min-width: 0;
}
.feed-item__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.feed-item__desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 1px;
}

.feed-item__action {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary-500, var(--color-accent-primary));
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 150ms ease-out;
}
.feed-item:hover .feed-item__action {
  opacity: 1;
}
</style>
