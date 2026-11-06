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
// Section of a screen (ADR-027 §6): white with a subtle --elev-card on the near-white page; at most one
// `tinted` block (light lilac) per screen (dev warning); `plain` has no surface. Inside, rows split with a
// thin divider (`divide-y divide-line` on the list). Replaces `card`, `card-base` and the hand-made boxes.
const props = withDefaults(defineProps<{
  title?: string
  /** Small label above the title (12/600) */
  label?: string
  description?: string
  variant?: 'raised' | 'tinted' | 'plain'
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
  const surface = props.variant === 'tinted' ? 'bg-tinted' : 'bg-raised shadow-card'
  return `${surface} rounded-card ${props.flush ? '' : 'p-5 sm:p-6'}`
})

useScopedLimit('UiSection variant="tinted"', () => root.value, () => props.variant === 'tinted')
</script>
