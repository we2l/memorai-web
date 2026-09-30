<template>
  <NuxtLink :to="item.url" class="event">
    <span class="event__icon">{{ item.icon }}</span>
    <div class="event__body">
      <p class="event__title">{{ item.label }}</p>
      <p v-if="item.description" class="event__desc">{{ item.description }}</p>
    </div>
    <span class="event__action">{{ item.action_label }} →</span>
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
.event {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background 150ms ease-out;
  background: var(--bg-card);
  border: 1px solid transparent;
}
.event:hover {
  background: color-mix(in srgb, var(--color-primary-500) 3%, var(--bg-card));
  border-color: var(--border-base);
}
.dark .event:hover {
  border-color: color-mix(in srgb, var(--color-accent-primary) 10%, var(--border-base));
}

.event__icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--bg-soft);
}
.dark .event__icon {
  background: color-mix(in srgb, var(--color-accent-primary) 8%, var(--bg-soft));
}

.event__body {
  flex: 1;
  min-width: 0;
}
.event__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-heading);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.event__desc {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--text-muted);
  margin-top: 1px;
}

.event__action {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-primary-500);
  flex-shrink: 0;
  white-space: nowrap;
}
.dark .event__action {
  color: var(--color-accent-primary);
}
.event:hover .event__action {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
