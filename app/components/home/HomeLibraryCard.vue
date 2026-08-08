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
    <div class="library-card__footer">
      <span class="library-card__meta">{{ topic.flashcards_count }} cards</span>
    </div>
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
  padding: 13px 14px 11px 18px;
  background: var(--bg-card);
  border: 1px solid color-mix(in srgb, var(--border-base) 70%, transparent);
  border-radius: 9px;
  transition: all 180ms ease-out;
  overflow: hidden;
}
.library-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--nb-color);
  opacity: 0.65;
  transition: opacity 180ms ease-out;
}
.library-card:hover {
  border-color: color-mix(in srgb, var(--nb-color) 20%, var(--border-base));
  background: color-mix(in srgb, var(--nb-color) 2%, var(--bg-card));
}
.library-card:hover::before {
  opacity: 1;
}

.library-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.library-card__name {
  font-size: 14px;
  font-weight: 550;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  letter-spacing: -0.01em;
}

.library-card__badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 4px;
  flex-shrink: 0;
  letter-spacing: 0.01em;
}
.library-card__badge--pending {
  color: var(--color-primary-500, var(--color-accent-primary));
  background: color-mix(in srgb, var(--color-primary-500, var(--color-accent-primary)) 6%, transparent);
}
.library-card__badge--success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 6%, transparent);
}
.library-card__badge--muted {
  color: var(--color-text-muted);
  background: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
}

.library-card__footer {
  margin-top: 6px;
}

.library-card__meta {
  font-size: 12px;
  font-weight: 400;
  color: color-mix(in srgb, var(--color-text-muted) 80%, transparent);
  letter-spacing: 0.01em;
}
</style>
