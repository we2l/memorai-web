<template>
  <component :is="as" ref="root" :aria-labelledby="title ? titleId : undefined" :class="surfaceClass">
    <div v-if="title || label || $slots.action" class="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <p v-if="label" class="text-label font-semibold" :class="variant === 'tinted' ? 'text-action-fg' : 'text-fg-muted'">{{ label }}</p>
        <component :is="`h${level}`" v-if="title" :id="titleId" class="text-section text-fg-strong">{{ title }}</component>
        <p v-if="description" class="mt-1 text-meta text-fg-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.action" class="flex shrink-0 items-center gap-2">
        <slot name="action" />
      </div>
    </div>
    <slot />
  </component>
</template>

<script setup lang="ts">
// Section of a screen, E2 skin (ADR-035 §3, prd-visual-e2 RF-1.2): the white card with the layered shadow
// (shadow-1, radius 20) on the white page, no border; at most one `tinted` block (lilac, radius 24, an inner ring
// in the dark) per screen (dev warning); `tile` is the soft square of a metric or a support block (radius 16);
// `plain` has no surface. Inside, rows split with the hairline. Replaces `card`, `card-base` and hand-made boxes.
const props = withDefaults(defineProps<{
  title?: string
  /** Small label above the title (12/600) */
  label?: string
  description?: string
  variant?: 'raised' | 'tinted' | 'tile' | 'plain'
  /** Heading level of the title */
  level?: 2 | 3 | 4
  as?: string
  /** No inner padding (lists that run to the edges) */
  flush?: boolean
}>(), {
  title: undefined,
  label: undefined,
  description: undefined,
  variant: 'raised',
  level: 2,
  as: 'section',
})

const titleId = useId()
const root = ref<HTMLElement | null>(null)

const surfaceClass = computed(() => {
  if (props.variant === 'plain') return ''
  const surface = {
    tinted: 'bg-tinted shadow-tinted rounded-hero',
    tile: 'bg-soft rounded-tile',
    raised: 'bg-raised shadow-1 rounded-card',
  }[props.variant]
  const pad = props.variant === 'tile' ? 'p-4' : 'p-5 sm:p-6'
  return `${surface} ${props.flush ? '' : pad}`
})

useScopedLimit('UiSection variant="tinted"', () => root.value, () => props.variant === 'tinted')
</script>
