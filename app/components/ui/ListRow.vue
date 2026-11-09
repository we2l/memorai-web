<template>
  <component
    :is="tag"
    v-bind="bindings"
    :aria-current="active ? (isLink ? 'page' : 'true') : undefined"
    class="flex w-full min-h-touch items-center gap-3 rounded-row px-3 py-3 text-left"
    :class="[
      active ? 'bg-action-subtle' : interactive && 'hover:bg-soft',
      interactive && 'transition-colors duration-fast',
    ]"
  >
    <span v-if="$slots.leading" class="flex shrink-0 items-center">
      <slot name="leading" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-medium break-words" :class="active ? 'text-action-fg' : 'text-fg-strong'">
        <slot name="title">{{ title }}</slot>
      </span>
      <span v-if="meta || $slots.meta" class="block text-meta text-fg-muted">
        <slot name="meta">{{ meta }}</slot>
      </span>
    </span>
    <span v-if="$slots.trailing" class="flex shrink-0 items-center gap-3 text-meta text-fg-muted">
      <slot name="trailing" />
    </span>
  </component>
</template>

<script setup lang="ts">
// List row (raio-X §D): replaces HomeLibraryCard, StartCard, .note-card, the podcast/exam lists and the
// 32 row-like buttons. With `to`/`href` the whole row is the link; `as="button"` makes it a button
// (listeners fall through). When the row is a link or button, `trailing` holds no other control.
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  title?: string
  meta?: string
  to?: RouteLocationRaw
  href?: string
  /** Current item (tree, menu): action tint and aria-current */
  active?: boolean
  as?: 'div' | 'li' | 'button'
}>(), { title: undefined, meta: undefined, to: undefined, href: undefined, as: 'div' })

const NuxtLink = resolveComponent('NuxtLink')
const isLink = computed(() => props.to !== undefined || props.href !== undefined)
const interactive = computed(() => isLink.value || props.as === 'button')
const tag = computed(() => {
  if (props.to !== undefined) return NuxtLink
  if (props.href !== undefined) return 'a'
  return props.as
})
const bindings = computed(() => {
  if (props.to !== undefined) return { to: props.to }
  if (props.href !== undefined) return { href: props.href }
  return props.as === 'button' ? { type: 'button' } : {}
})
</script>
