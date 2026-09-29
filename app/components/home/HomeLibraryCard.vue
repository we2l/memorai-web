<template>
  <NuxtLink
    :to="`/cadernos?topic=${topic.id}`"
    class="card"
    :style="{ '--nb-color': topic.color || 'var(--color-primary-500)' }"
  >
    <div class="card__bar" />
    <div class="card__body">
      <h3 class="card__title">{{ topic.name }}</h3>
      <div class="card__footer">
        <span class="card__count">{{ topic.flashcards_count }} cards</span>
        <span class="card__badge" :class="badgeClass">{{ state.text }}</span>
      </div>
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

const badgeClass = computed(() => `card__badge--${state.value.variant}`)
</script>

<style scoped>
.card {
  display: flex;
  align-items: stretch;
  min-height: 76px;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 12px;
  overflow: hidden;
  transition: all 180ms ease-out;
  box-shadow: 0 1px 3px rgba(111, 63, 245, 0.03);
}
.dark .card {
  background: var(--bg-card);
  border-color: var(--border-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.card:hover {
  border-color: color-mix(in srgb, var(--nb-color) 35%, var(--border-hover));
  box-shadow:
    0 4px 12px color-mix(in srgb, var(--nb-color) 8%, transparent),
    0 1px 3px rgba(0, 0, 0, 0.03);
  transform: translateY(-2px);
}
.dark .card:hover {
  border-color: color-mix(in srgb, var(--nb-color) 30%, var(--border-base));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card__bar {
  width: 4px;
  flex-shrink: 0;
  background: var(--nb-color);
  opacity: 0.6;
  transition: opacity 180ms ease-out;
}
.card:hover .card__bar {
  opacity: 1;
}

.card__body {
  flex: 1;
  min-width: 0;
  padding: 14px 16px 12px 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.card__title {
  font-size: 14.5px;
  font-weight: 580;
  color: var(--text-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__count {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}

.card__badge {
  font-size: 11px;
  font-weight: 560;
  padding: 2px 9px;
  border-radius: 10px;
  letter-spacing: 0.01em;
}
.card__badge--pending {
  color: var(--color-primary-600);
  background: var(--badge-primary-bg);
}
.dark .card__badge--pending {
  color: var(--color-accent-primary);
  background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent);
}
.card__badge--success {
  color: var(--badge-success-text);
  background: var(--badge-success-bg);
}
.card__badge--muted {
  color: var(--text-muted);
  background: var(--badge-muted-bg);
}
</style>
