<template>
  <NuxtLink :to="item.url" class="feed-item">
    <div class="feed-item__icon" :class="iconVariant">
      <span class="feed-item__emoji">{{ item.icon }}</span>
    </div>
    <div class="feed-item__content">
      <p class="feed-item__title">{{ item.label }}</p>
      <span class="feed-item__action">{{ item.action_label }} →</span>
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
}

.feed-item__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.feed-item__emoji {
  font-size: 14px;
}
.feed-item__icon--doc {
  background: color-mix(in srgb, var(--color-primary-500) 6%, var(--bg-soft));
}
.feed-item__icon--weak {
  background: color-mix(in srgb, var(--color-danger) 8%, var(--bg-soft));
}
.feed-item__icon--podcast {
  background: color-mix(in srgb, var(--color-success) 6%, var(--bg-soft));
}
.feed-item__icon--default {
  background: var(--bg-soft);
}

.feed-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.feed-item__title {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-primary);
  line-height: 1.4;
}
.feed-item__action {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary-500, var(--color-accent-primary));
}
.feed-item:hover .feed-item__action {
  text-decoration: underline;
}
</style>
