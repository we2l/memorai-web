<template>
  <NuxtLink
    :to="`/cadernos?topic=${topic.id}`"
    class="library-card"
    :style="{ '--nb-color': topic.color || 'var(--color-primary-500, var(--color-accent-primary))' }"
  >
    <div class="library-card__header">
      <span class="library-card__name">{{ topic.name }}</span>
      <span class="library-card__state" :class="state.class">{{ state.text }}</span>
    </div>
    <div class="library-card__bar">
      <div class="library-card__bar-fill" :style="{ width: progressWidth }" />
    </div>
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
const progressWidth = computed(() => Math.round(progress.value * 100) + '%')

const state = computed(() => {
  if (pending.value === 0 && progress.value > 0) {
    return { text: 'Em dia', class: 'library-card__state--success' }
  }
  if (pending.value > 0) {
    return { text: `${pending.value} pendentes`, class: 'library-card__state--pending' }
  }
  return { text: 'Novo', class: 'library-card__state--muted' }
})
</script>

<style scoped>
.library-card {
  position: relative;
  padding: 12px 14px 12px 18px;
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
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--nb-color);
  opacity: 0.6;
  transition: opacity 150ms ease-out;
}
.library-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--nb-color) 20%, var(--border-base));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.library-card:hover::before {
  opacity: 1;
}

.library-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.library-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.library-card__state {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}
.library-card__state--success {
  color: var(--color-success);
}
.library-card__state--pending {
  color: var(--color-primary-500, var(--color-accent-soft));
}
.library-card__state--muted {
  color: var(--color-text-muted);
}

.library-card__bar {
  height: 2px;
  border-radius: 99px;
  background: var(--bg-soft);
  overflow: hidden;
  margin-top: 8px;
}
.library-card__bar-fill {
  height: 100%;
  border-radius: 99px;
  background: var(--nb-color);
  opacity: 0.5;
  transition: width 300ms ease-out;
}

.library-card__meta {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 6px;
}
</style>
