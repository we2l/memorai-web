<template>
  <NuxtLink
    :to="`/cadernos?topic=${topic.id}`"
    class="library-card"
    :style="{ '--nb-color': topic.color || 'var(--color-primary-500, var(--color-accent-primary))' }"
  >
    <div class="flex items-center justify-between">
      <span class="text-[15px] font-semibold text-base-primary truncate">{{ topic.name }}</span>
      <span class="text-xs font-medium shrink-0 ml-3" :class="state.class">{{ state.text }}</span>
    </div>
    <div class="library-card__bar">
      <div class="library-card__bar-fill" :style="{ width: progressWidth }" />
    </div>
    <p class="text-xs text-base-muted mt-1.5">{{ state.label }} · {{ topic.flashcards_count }} cards</p>
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
    return { text: 'Em dia ✓', class: 'text-success', label: 'Em dia' }
  }
  if (pending.value > 0) {
    return { text: `${pending.value} pendentes`, class: 'text-[var(--color-primary-500,var(--color-accent-soft))]', label: `${pending.value} pendentes` }
  }
  return { text: 'Novo', class: 'text-base-muted', label: 'Novo' }
})
</script>

<style scoped>
.library-card {
  position: relative;
  padding: 14px 16px 14px 20px;
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
  top: 10px;
  bottom: 10px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--nb-color);
  opacity: 0.7;
  transition: opacity 150ms;
}
.library-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--nb-color) 25%, var(--border-base));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
.library-card:hover::before {
  opacity: 1;
}

.library-card__bar {
  height: 3px;
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
</style>
