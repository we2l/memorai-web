<template>
  <component
    :is="tag"
    ref="root"
    v-bind="bindings"
    :class="classes"
    :aria-disabled="ariaDisabled"
    :aria-busy="loading ? 'true' : undefined"
    @click="onClick"
  >
    <UiSpinner v-if="loading" :size="size" />
    <component :is="iconLeft" v-else-if="iconLeft" :class="iconClass" aria-hidden="true" />
    <slot />
    <component :is="iconRight" v-if="iconRight" :class="iconClass" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
// DS v3 button (ADR-027 §6, raio-X §D). One primary per screen, purple with "volume" (shadow-press);
// the others are neutral and may carry the colored icon of a practice mode (iconTone: color only on
// the icon, never as fill). Replaces btn-*, the 24 hand-made spinners and the `!min-h-0 !px-3` small button.
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'
export type IconTone = 'action' | 'quiz' | 'listen'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  /** md: 44 px; sm: 36 px with the touch area stretched to 44 px */
  size?: ButtonSize
  to?: RouteLocationRaw
  href?: string
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  iconLeft?: Component
  iconRight?: Component
  /** Colors only the icon (practice mode); ignored on primary, whose icon follows the text */
  iconTone?: IconTone
}>(), {
  variant: 'secondary',
  size: 'md',
  to: undefined,
  href: undefined,
  type: 'button',
  iconLeft: undefined,
  iconRight: undefined,
  iconTone: undefined,
})

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const NuxtLink = resolveComponent('NuxtLink')
const root = ref<HTMLElement | { $el: HTMLElement } | null>(null)

// Loading keeps the focus (aria-disabled, no native disabled); disabled links lose the href
const inert = computed(() => props.disabled || props.loading)
const isLink = computed(() => props.to !== undefined || props.href !== undefined)
const tag = computed(() => {
  if (!isLink.value) return 'button'
  return props.to !== undefined && !inert.value ? NuxtLink : 'a'
})
const bindings = computed(() => {
  if (!isLink.value) return { type: props.type, disabled: props.disabled || undefined }
  if (inert.value) return {}
  return props.to !== undefined ? { to: props.to } : { href: props.href }
})
const ariaDisabled = computed(() => (inert.value && (isLink.value || props.loading) ? 'true' : undefined))

const VARIANTS: Record<ButtonVariant, { rest: string; live: string }> = {
  primary: {
    rest: 'bg-action text-on-action shadow-press',
    live: 'hover:bg-action-hover active:translate-y-0.5 active:shadow-press-active',
  },
  secondary: { rest: 'bg-raised text-fg-strong border border-line-strong', live: 'hover:bg-subtle active:bg-line' },
  ghost: { rest: 'text-fg-strong', live: 'hover:bg-subtle active:bg-line' },
  danger: { rest: 'bg-danger-subtle text-danger border border-transparent', live: 'hover:border-danger' },
}
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-touch px-4.5 text-body',
  sm: 'min-h-9 px-3 text-meta before:absolute before:-inset-1',
}
const ICON_TONES: Record<IconTone, string> = { action: 'text-action-fg', quiz: 'text-quiz', listen: 'text-listen' }

const classes = computed(() => {
  const v = VARIANTS[props.variant]
  let state = `${v.rest} ${v.live}`
  if (props.disabled) {
    // Primary disabled stays >= 3:1 in both themes (fg-muted on line-strong)
    state = props.variant === 'primary' ? 'bg-line-strong text-fg-muted cursor-not-allowed' : `${v.rest} opacity-50 cursor-not-allowed`
  } else if (props.loading) {
    state = `${v.rest} cursor-progress`
  }
  return [
    'relative inline-flex items-center justify-center gap-2 rounded-control font-semibold text-center select-none transition duration-nav ease-calm',
    SIZES[props.size],
    state,
    props.block && 'w-full',
  ]
})

const iconClass = computed(() => [
  'shrink-0',
  props.size === 'sm' ? 'size-4' : 'size-4.5',
  props.variant !== 'primary' && props.iconTone ? ICON_TONES[props.iconTone] : '',
])

function onClick(event: MouseEvent) {
  if (inert.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}

useScopedLimit(
  'variant="primary"',
  () => { const r = root.value; return r && '$el' in r ? r.$el : r },
  () => props.variant === 'primary',
)
</script>
