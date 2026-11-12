<template>
  <component
    :is="tag"
    v-bind="bindings"
    :aria-label="label"
    :aria-pressed="pressed === undefined ? undefined : String(pressed)"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="loading ? 'true' : undefined"
    :class="classes"
    @click="onClick"
  >
    <UiSpinner v-if="loading" :size="size" />
    <component :is="icon" v-else :class="size === 'sm' ? 'size-4' : 'size-5'" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
// Icon-only button (raio-X §D): the label is required and becomes the aria-label. Replaces the 15+
// hand-made icon buttons (close of Modal and Toast, tree actions). sm is 36 px with a 44 px touch area.
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  icon: Component
  label: string
  variant?: 'ghost' | 'subtle'
  size?: 'sm' | 'md'
  to?: RouteLocationRaw
  type?: 'button' | 'submit' | 'reset'
  /** Toggle button: renders aria-pressed */
  pressed?: boolean
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'ghost',
  size: 'md',
  to: undefined,
  type: 'button',
  pressed: undefined,
})

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()
const NuxtLink = resolveComponent('NuxtLink')

const tag = computed(() => (props.to !== undefined && !props.disabled ? NuxtLink : 'button'))
const bindings = computed(() => (props.to !== undefined && !props.disabled
  ? { to: props.to }
  : { type: props.type, disabled: props.disabled || undefined }))

const classes = computed(() => [
  'relative inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-fast',
  props.size === 'sm' ? 'size-9 before:absolute before:-inset-1' : 'size-touch',
  props.variant === 'subtle' ? 'bg-soft text-fg-strong' : 'text-fg-muted',
  props.pressed ? 'bg-action-subtle text-action-fg' : '',
  props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover hover:text-fg-strong',
])

function onClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>
