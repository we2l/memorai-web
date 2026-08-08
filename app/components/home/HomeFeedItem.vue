<template>
  <NuxtLink :to="item.url" class="feed-item">
    <div class="feed-item__icon" :class="iconVariant">
      <span class="feed-item__emoji">{{ item.icon }}</span>
    </div>
    <div class="feed-item__content">
      <p class="feed-item__title">{{ item.label }}</p>
      <span class="feed-item__action">{{ item.action_label }} <span class="feed-item__arrow">→</span></span>
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
  gap: 10px;
}

.feed-item__icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.feed-item__emoji {
  font-size: 13px;
}
.feed-item__icon--doc {
  background: color-mix(in srgb, var(--color-primary-500) 5%, var(--bg-soft));
}
.feed-item__icon--weak {
  background: color-mix(in srgb, var(--color-danger) 6%, var(--bg-soft));
}
.feed-item__icon--podcast {
  background: color-mix(in srgb, var(--color-success) 5%, var(--bg-soft));
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
  font-weight: 400;
  color: var(--color-text-primary);
  line-height: 1.45;
  letter-spacing: 0.005em;
}
.feed-item__action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 550;
  color: var(--color-primary-500, var(--color-accent-primary));
  margin-top: 2px;
  transition: opacity 150ms ease-out;
}
.feed-item:hover .feed-item__action {
  opacity: 0.75;
}
.feed-item__arrow {
  font-size: 11px;
  transition: transform 150ms ease-out;
}
.feed-item:hover .feed-item__arrow {
  transform: translateX(2px);
}
</style>
