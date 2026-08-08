<template>
  <NuxtLink :to="item.url" class="feed-item group">
    <span class="text-lg shrink-0 mt-0.5">{{ item.icon }}</span>
    <div class="flex-1 min-w-0">
      <p class="text-[13.5px] text-base-primary leading-relaxed">{{ item.label }}</p>
      <p class="text-[13px] text-accent-primary font-medium mt-0.5 group-hover:underline">{{ item.action_label }} →</p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
export interface FeedItemData {
  icon: string
  label: string
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
  align-items: flex-start;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 8px;
  transition: background 100ms ease;
}
.feed-item:hover {
  background: var(--bg-soft);
}
</style>
