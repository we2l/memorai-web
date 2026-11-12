<template>
  <span
    class="inline-flex shrink-0 items-center justify-center font-bold text-raised"
    :class="[BG[tone - 1], size === 'sm' ? 'size-8 rounded-row text-label' : 'size-10 rounded-icon text-label']"
    aria-hidden="true"
  >{{ initials }}</span>
</template>

<script setup lang="ts">
// Notebook cover (A2, ADR-037): a small square in the notebook's color with its initials, where a list shows
// notebooks (Hoje, /cadernos). Decorative: the name always sits beside it. The text takes the card color (white in
// light, near black in dark), so it reads on the subject tones of both themes (tokensContrast).
import { notebookInitials } from '~/utils/notebookInitials'

const props = withDefaults(defineProps<{
  name: string
  color?: string | null
  index?: number
  /** sm 32 px (phone lists) · md 40 px */
  size?: 'sm' | 'md'
}>(), { color: undefined, index: undefined, size: 'md' })

const BG = ['bg-subject-1', 'bg-subject-2', 'bg-subject-3', 'bg-subject-4', 'bg-subject-5', 'bg-subject-6', 'bg-subject-7', 'bg-subject-8']
const tone = computed(() => subjectTone(props.color, props.index))
const initials = computed(() => notebookInitials(props.name))
</script>
