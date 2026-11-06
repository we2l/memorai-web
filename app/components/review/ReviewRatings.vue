<template>
  <div role="group" aria-label="Como foi" class="grid grid-cols-4 gap-2" data-testid="review-ratings">
    <button
      v-for="r in RATINGS"
      :key="r.value"
      type="button"
      class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-2 text-meta font-semibold transition-colors duration-nav"
      :class="r.value === 3 ? 'bg-action text-on-action shadow-press hover:bg-action-hover active:translate-y-0.5 active:shadow-press-active' : 'border border-line-strong bg-raised text-fg-strong hover:bg-subtle'"
      :aria-keyshortcuts="String(r.value)"
      :aria-label="`${r.label}${intervals[r.key] ? `, volta em ${intervals[r.key]}` : ''} (${r.value})`"
      :data-variant="r.value === 3 ? 'primary' : 'secondary'"
      :data-testid="`rate-${r.value}`"
      @click="$emit('rate', r.value)"
    >
      <span class="flex items-center gap-1.5">
        <kbd class="hidden rounded-tag border px-1 font-sans text-label pointer-fine:inline" :class="r.value === 3 ? 'border-on-action/40' : 'border-line-strong text-fg-muted'" aria-hidden="true">{{ r.value }}</kbd>
        {{ r.label }}
      </span>
      <span class="text-label font-normal" :class="r.value === 3 ? 'text-on-action' : 'text-fg-muted'" aria-hidden="true">{{ intervals[r.key] || '·' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
// The 4 ratings of the review (prd-4d-revisao-v3 RF-F4): the same order in every size of screen
// (1 De novo · 2 Difícil · 3 Bom · 4 Fácil, the Anki convention), the interval under each and the key on
// a pointer device. "Bom" is the screen's single primary while the answer shows. 4 in a row on a 390 px
// phone (≈ 82 px each, 56 px tall).
type Key = 'again' | 'hard' | 'good' | 'easy'

defineProps<{ intervals: Record<Key, string> }>()
defineEmits<{ (e: 'rate', rating: 1 | 2 | 3 | 4): void }>()

const RATINGS: { value: 1 | 2 | 3 | 4; key: Key; label: string }[] = [
  { value: 1, key: 'again', label: 'De novo' },
  { value: 2, key: 'hard', label: 'Difícil' },
  { value: 3, key: 'good', label: 'Bom' },
  { value: 4, key: 'easy', label: 'Fácil' },
]
</script>
