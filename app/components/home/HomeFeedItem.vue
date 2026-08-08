<template>
  <NuxtLink :to="item.url" class="feed-card group">
    <span class="text-lg shrink-0">{{ item.icon }}</span>
    <div class="flex-1 min-w-0">
      <p class="text-[13px] font-semibold text-base-primary leading-snug">{{ item.label }}</p>
      <p v-if="item.description" class="text-[12px] text-base-muted mt-0.5 truncate">{{ item.description }}</p>
      <p class="text-[12px] text-accent-primary font-medium mt-1 group-hover:underline">{{ item.action_label }} →</p>
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

defineProps<{
  item: FeedItemData
}>()
</script>

<style scoped>
.feed-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 10px;
  transition: all 150ms ease-out;
}
.feed-card:hover {
  border-color: color-mix(in srgb, var(--color-primary-500, var(--color-accent-primary)) 20%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}
</style>
