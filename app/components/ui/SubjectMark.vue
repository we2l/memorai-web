<template>
  <span
    class="inline-block shrink-0 rounded-full"
    :class="[BG[tone - 1], SIZES[size]]"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  />
</template>

<script setup lang="ts">
// Subject dot (ADR-027 §6, v4): the color of a subject only in small, next to its name. topic.color
// (picker value or hex) maps to the nearest of the 8 tones; without a color, `index` keeps it stable.
// Decorative by default: the name beside it informs.
const props = withDefaults(defineProps<{
  color?: string | null
  index?: number
  /** sm 10 px · md 12 px · lg 14 px (page title) */
  size?: 'sm' | 'md' | 'lg'
  /** Only when the dot stands alone (no name beside it) */
  label?: string
}>(), { color: undefined, index: undefined, size: 'sm', label: undefined })

// Full class names: Tailwind only generates what it finds written
const BG = ['bg-subject-1', 'bg-subject-2', 'bg-subject-3', 'bg-subject-4', 'bg-subject-5', 'bg-subject-6', 'bg-subject-7', 'bg-subject-8']
const SIZES = { sm: 'size-2.5', md: 'size-3', lg: 'size-3.5' }

const tone = computed(() => subjectTone(props.color, props.index))
</script>
