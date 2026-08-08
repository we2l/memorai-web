<template>
  <NuxtLink :to="item.url" class="feed-item group">
    <span class="feed-item__icon" :class="iconVariant">{{ item.icon }}</span>
    <div class="feed-item__content">
      <p class="feed-item__title">{{ item.label }}</p>
      <p v-if="item.description" class="feed-item__desc">{{ item.description }}</p>
      <p class="feed-item__action">{{ item.action_label }} →</p>
    </div>
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

const props = defineProps<{
  item: FeedItemData
}>()

const iconVariant = computed(() => {
  if (props.item.icon === '📄') return 'feed-item__icon--doc'
  if (props.item.icon === '🧠') return 'feed-item__icon--weak'
  if (props.item.icon === '🎧') return 'feed-item__icon--podcast'
  return 'feed-item__icon--default'
})
</script>

<style scoped>
.feed-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background 120ms ease-out;
}
.feed-item:hover {
  background: var(--bg-soft);
}

.feed-item__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.feed-item__icon--doc {
  background: color-mix(in srgb, var(--color-primary-500) 8%, transparent);
}
.feed-item__icon--weak {
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
}
.feed-item__icon--podcast {
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}
.feed-item__icon--default {
  background: var(--bg-soft);
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
}
.feed-item__desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 1px;
}
.feed-item__action {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary-500, var(--color-accent-primary));
  margin-top: 3px;
}
</style>
