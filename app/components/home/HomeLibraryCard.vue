<template>
  <NuxtLink
    :to="`/cadernos?topic=${topic.id}`"
    class="library-card"
    :style="{ '--nb-color': topic.color || 'var(--color-primary-500, var(--color-accent-primary))' }"
  >
    <div class="library-card__top">
      <span class="library-card__name">{{ topic.name }}</span>
      <span class="library-card__badge" :class="badgeClass">{{ state.text }}</span>
    </div>
    <div class="library-card__divider" />
    <p class="library-card__meta">{{ topic.flashcards_count }} cards</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { TopicProgress } from '~/types'

const props = defineProps<{
  topic: TopicProgress
}>()

const pending = computed(() => (props.topic as any).pending_count ?? 0)
const progress = computed(() => props.topic.progress ?? 0)

const state = computed(() => {
  if (pending.value === 0 && progress.value > 0) {
    return { text: 'Em dia', variant: 'success' }
  }
  if (pending.value > 0) {
    return { text: `${pending.value} pendentes`, variant: 'pending' }
  }
  return { text: 'Novo', variant: 'muted' }
})

const badgeClass = computed(() => `library-card__badge--${state.value.variant}`)
</script>

<style scoped>
.library-card {
  position: relative;
  padding: 14px 16px 14px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 12px;
  transition: all 150ms ease-out;
  overflow: hidden;
}
.library-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--nb-color);
  opacity: 0.8;
}
.library-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--nb-color) 25%, var(--border-base));
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
}
.library-card:hover::before {
  opacity: 1;
}

.library-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.library-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.library-card__badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 99px;
  flex-shrink: 0;
}
.library-card__badge--pending {
  color: var(--color-primary-500, var(--color-accent-primary));
  background: color-mix(in srgb, var(--color-primary-500, var(--color-accent-primary)) 8%, transparent);
}
.library-card__badge--success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 8%, transparent);
}
.library-card__badge--muted {
  color: var(--color-text-muted);
  background: var(--bg-soft);
}

.library-card__divider {
  height: 1px;
  background: var(--border-base);
  margin: 10px 0;
  opacity: 0.6;
}

.library-card__meta {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
