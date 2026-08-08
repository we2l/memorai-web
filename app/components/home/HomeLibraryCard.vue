<template>
  <NuxtLink
    :to="`/cadernos?topic=${topic.id}`"
    class="library-card"
    :style="{ '--nb-color': topic.color || 'var(--color-primary-500, var(--color-accent-primary))' }"
  >
    <div class="library-card__header">
      <h3 class="library-card__name">{{ topic.name }}</h3>
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
  padding: 14px 16px 12px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 10px;
  transition: all 150ms ease-out;
  overflow: hidden;
}
.library-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 10px 0 0 10px;
  background: var(--nb-color);
}
.library-card:hover {
  border-color: color-mix(in srgb, var(--nb-color) 30%, var(--border-base));
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
}

.library-card__header {
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
  letter-spacing: -0.01em;
}

.library-card__badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 5px;
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
  margin: 10px 0 8px;
}

.library-card__meta {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
